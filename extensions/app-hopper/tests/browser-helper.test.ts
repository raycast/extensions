import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import createLoader from "./load-ts.ts";
import type { MockValue } from "./load-ts.ts";

test("browser helper preserves one native session, serializes requests, and rejects expired identities", async (t) => {
  const fixture = path.join(__dirname, "fixtures", "browser-helper.ts");
  const children: ReturnType<typeof spawn>[] = [];
  t.after(() => {
    children.forEach((child) => child.kill());
  });
  const load = createLoader({
    "./applescript": { OSA_TIMEOUT_MS: 1000 },
    "./native-helper": { ensureNativeHelper: async () => "/fixture/browser-helper" },
    "node:child_process": {
      spawn: () => {
        const child = spawn(process.execPath, ["--import", "tsx", fixture]);
        children.push(child);
        return child;
      },
    },
  });
  const { runBrowserHelper } = load("src/helpers/browser-helper.ts");
  const request = (args: string[]) => runBrowserHelper("test", "/fixture", args);
  const identity = "10:ax:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  await assert.rejects(request(["focus", "Browser", "10", identity]), /expired/);
  assert.equal(children.length, 0);
  const [first, second] = await Promise.all([request(["list", "Browser", "one"]), request(["list", "Browser", "two"])]);
  assert.equal(JSON.parse(first).count, 1);
  assert.equal(JSON.parse(second).count, 2);
  assert.equal(children.length, 1);
  await assert.rejects(request(["fail", "Browser"]), /Tab changed/);
  assert.equal(JSON.parse(await request(["focus", "Browser", "10", identity])).count, 3);
  await assert.rejects(request(["exit", "Browser"]), /session ended/);
  await assert.rejects(request(["focus", "Browser", "10", identity]), /expired/);
  assert.equal(children.length, 1);
  assert.equal(JSON.parse(await request(["list", "Browser"])).count, 1);
  assert.equal(children.length, 2);
});

test("a slow browser neither delays another browser nor expires its retained tab session", async (t) => {
  const children: MockValue[] = [];
  t.after(() => children.forEach((child) => child.kill()));
  const { runBrowserHelper } = createLoader({
    "./applescript": { OSA_TIMEOUT_MS: 50 },
    "./native-helper": { ensureNativeHelper: async () => "/fixture/browser-helper" },
    "node:child_process": {
      spawn: () => {
        const child: MockValue = new EventEmitter();
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.stdin = new Writable({
          write(chunk, _encoding, callback) {
            const args = JSON.parse(chunk.toString());
            if (args[1] !== "Slow") queueMicrotask(() => child.stdout.write(JSON.stringify({ args }) + "\n"));
            callback();
          },
        });
        child.kill = () => child.emit("exit");
        children.push(child);
        return child;
      },
    },
  })("src/helpers/browser-helper.ts");
  const slow = runBrowserHelper("engine", "/fixture", ["list", "Slow"]).catch((error: Error) => error.message);
  const fast = await runBrowserHelper("engine", "/fixture", ["list", "Fast"]);
  assert.equal(JSON.parse(fast).args[1], "Fast");
  assert.match(await slow, /timed out/);
  await runBrowserHelper("engine", "/fixture", ["focus", "Fast", "10", "10:ax:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"]);
  assert.equal(children.length, 2, "the fast browser keeps its own helper after the slow browser times out");
});
