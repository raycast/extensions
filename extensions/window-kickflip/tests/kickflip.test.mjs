import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/kickflip.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
});

function loadKickflip({ playSound = true, animate = async () => {}, frontmost = ["com.example.editor"] } = {}) {
  const events = [];
  const captures = [];
  const hud = [];
  const api = {
    getPreferenceValues: () => ({ playSound }),
    PopToRootType: { Suspended: "suspended" },
    closeMainWindow: async (options) => events.push(["close", options.popToRootType]),
    showHUD: async (message, options) => hud.push([message, options?.popToRootType]),
    getFrontmostApplication: async () => {
      const bundleId = frontmost.length > 1 ? frontmost.shift() : frontmost[0];
      events.push(["frontmost", bundleId]);
      if (bundleId instanceof Error) throw bundleId;
      return { bundleId };
    },
  };
  const exports = {};
  runInNewContext(outputText, {
    exports,
    Error,
    require: (name) => {
      if (name === "@raycast/api") return api;
      if (name === "node:timers/promises") return { setTimeout: async (ms) => events.push(["wait", ms]) };
      if (name === "swift:../../swift/window-kickflip")
        return {
          animateKickflip: async (...args) => {
            captures.push(args);
            await animate(...args);
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { run: exports.doKickflip, events, captures, hud };
}

test("starts right away when focus has already returned to the previous app", async () => {
  const app = loadKickflip();
  await app.run();
  assert.deepEqual(app.events, [
    ["close", "suspended"],
    ["frontmost", "com.example.editor"],
  ]);
  assert.deepEqual(app.captures, [[true]]);
});

test("waits for focus to leave Raycast before Swift picks the focused window", async () => {
  const app = loadKickflip({ frontmost: ["com.raycast.macos", new Error("busy"), "com.example.editor"] });
  await app.run();
  assert.deepEqual(app.events, [
    ["close", "suspended"],
    ["frontmost", "com.raycast.macos"],
    ["wait", 20],
    ["frontmost", app.events[3][1]],
    ["wait", 20],
    ["frontmost", "com.example.editor"],
  ]);
  assert.ok(app.events[3][1] instanceof Error);
  assert.deepEqual(app.captures, [[true]]);
});

test("gives up waiting after 600 ms and lets Swift report the focus problem", async () => {
  const app = loadKickflip({ frontmost: ["com.raycast.macos"] });
  await app.run();
  assert.equal(app.events.filter(([name]) => name === "wait").length, 30);
  assert.deepEqual(app.captures, [[true]]);
});

test("lets the animation speak for itself on success", async () => {
  const app = loadKickflip();
  await app.run();
  assert.deepEqual(app.hud, []);
});

test("passes the disabled sound preference to Swift without skipping the animation", async () => {
  const app = loadKickflip({ playSound: false });
  await app.run();
  assert.deepEqual(app.captures, [[false]]);
});

test("reports native errors in a HUD that keeps the view command alive, and allows a retry", async () => {
  let attempt = 0;
  const app = loadKickflip({
    animate: async () => {
      if (++attempt === 1) throw new Error("Allow Screen Recording");
    },
  });
  await app.run();
  assert.deepEqual(app.hud, [["Allow Screen Recording", "suspended"]]);
  await app.run();
  assert.equal(app.captures.length, 2);
  assert.equal(app.hud.length, 1);
});

test("waits for Swift to finish, ignores repeated actions, then allows another kickflip", async () => {
  const started = Promise.withResolvers();
  const resume = Promise.withResolvers();
  const app = loadKickflip({
    animate: async () => {
      started.resolve();
      await resume.promise;
    },
  });
  const first = app.run();
  await started.promise;
  await app.run();
  assert.equal(app.captures.length, 1);
  resume.resolve();
  await first;
  await app.run();
  assert.equal(app.captures.length, 2);
});
