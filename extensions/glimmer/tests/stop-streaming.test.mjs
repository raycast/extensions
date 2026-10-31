import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { promisify } from "node:util";
import { loadSource } from "./helpers/load-source.mjs";
import * as contract from "../src/lib/contract.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/glimmer/contract-v1.json", import.meta.url), "utf8"));

function setup({
  code = 0,
  stdout = JSON.stringify(code === 5 ? fixture.stopIdle : fixture.stopStopped),
  confirmation = true,
  available = "/usr/local/bin/glimmer",
  accessError,
  executionError,
  openError,
} = {}) {
  const events = [];
  const alerts = [];
  const hud = [];
  const toasts = [];
  const executions = [];
  const api = {
    Alert: { ActionStyle: { Destructive: "destructive", Cancel: "cancel" } },
    Toast: { Style: { Success: "success", Failure: "failure" } },
    confirmAlert: async (options) => {
      events.push("confirm");
      alerts.push(options);
      return confirmation;
    },
    showHUD: async (message) => hud.push(message),
    showToast: async (options) => toasts.push(options),
    open: async (url) => {
      events.push(url);
      if (openError) throw openError;
    },
  };
  const execFile = () => assert.fail("Execution must use the promisified API");
  execFile[promisify.custom] = async (path, args, options) => {
    events.push("execute");
    executions.push({ path, args, options });
    if (executionError) throw executionError;
    if (code !== 0) throw Object.assign(new Error("Private stderr detail"), { code, stdout });
    return { stdout, stderr: "" };
  };
  const glimmer = loadSource("../src/lib/glimmer.ts", {
    "./contract": contract,
    "node:child_process": { execFile },
    "node:fs/promises": {
      access: async (path) => {
        events.push(`access:${path}`);
        if (accessError) throw accessError;
        if (path !== available) throw Object.assign(new Error("Missing"), { code: "ENOENT" });
      },
    },
  });
  const { default: command } = loadSource("../src/stop-streaming.ts", {
    "@raycast/api": api,
    "./lib/contract": contract,
    "./lib/glimmer": glimmer,
  });
  return { command, glimmer, api, events, alerts, hud, toasts, executions };
}

for (const code of [0, 5]) {
  test(`stop exit ${code} validates the real encoder output and reports the correct outcome`, async () => {
    const h = setup({ code });
    await h.command();
    assert.deepEqual(
      h.executions.map(({ path, args }) => ({ path, args })),
      [{ path: "/usr/local/bin/glimmer", args: ["stop", "--json"] }],
    );
    assert.equal(h.executions[0].options.shell, false);
    assert.equal(h.executions[0].options.timeout, 20_000);
    assert.deepEqual(h.hud, [code === 0 ? "Stream stopped." : "Nothing is streaming."]);
    assert.deepEqual(h.toasts, []);
    assert.equal(h.events[0], "confirm");
    assert.ok(!h.events.includes("glimmer://stop"));
    assert.equal(h.alerts[0].primaryAction.style, h.api.Alert.ActionStyle.Destructive);
    assert.equal(h.alerts[0].dismissAction.style, h.api.Alert.ActionStyle.Cancel);
    assert.match(h.alerts[0].message, /Leave games running when you disconnect/);
    assert.ok(!h.alerts[0].rememberUserChoice);
  });
}

test("confirmation waits for a decision and cancellation has no side effects, even without a CLI", async () => {
  let decide;
  const confirmation = new Promise((resolve) => (decide = resolve));
  const h = setup({ confirmation, available: null });
  const pending = h.command();
  assert.deepEqual(h.events, ["confirm"]);
  decide(false);
  await pending;
  assert.deepEqual(h.events, ["confirm"]);
  assert.deepEqual(h.hud, []);
  assert.deepEqual(h.toasts, []);
});

for (const code of [1, 2, 3, 4, 99, null]) {
  test(`stop exit ${code} is an error even with success JSON and never falls back to a URL`, async () => {
    const h = setup({ code, stdout: JSON.stringify(fixture.stopStopped) });
    await h.command();
    assert.deepEqual(h.hud, []);
    assert.deepEqual(h.toasts, [
      { style: "failure", title: "Couldn’t stop streaming", message: contract.exitCodeMessage(code) },
    ]);
    assert.ok(!h.events.includes("glimmer://stop"));
  });
}

for (const code of [1, 2]) {
  test(`stop exit ${code} accepts stderr-only failure without attempting to parse JSON`, async () => {
    const h = setup({ code, stdout: "" });
    await h.command();
    assert.equal(h.toasts[0].message, contract.exitCodeMessage(code));
  });
}

for (const code of [0, 5]) {
  test(`stop exit ${code} rejects malformed, missing, mistyped, or contradictory JSON`, async () => {
    const valid = code === 0 ? fixture.stopStopped : fixture.stopIdle;
    const invalid = ["", "not JSON", "null", "[]", "{}"];
    for (const version of [undefined, null, "1", 0, 2]) invalid.push(JSON.stringify({ ...valid, version }));
    for (const result of [undefined, null, "unknown", true, {}, "pcMismatch"])
      invalid.push(JSON.stringify({ ...valid, result }));
    for (const stopped of [undefined, null, "true", "false", 0, 1, {}, !valid.stopped])
      invalid.push(JSON.stringify({ ...valid, stopped }));
    invalid.push(JSON.stringify(code === 0 ? fixture.stopIdle : fixture.stopStopped));
    for (const stdout of invalid) {
      const h = setup({ code, stdout });
      await h.command();
      assert.deepEqual(h.hud, []);
      assert.equal(h.toasts[0].style, "failure", stdout);
      assert.ok(!h.events.includes("glimmer://stop"));
    }
  });
}

test("stop parser rejects a valid payload with any unsupported exit code", () => {
  for (const code of [1, 2, 3, 4, -1, 99, null, "0", "5"]) {
    for (const payload of [fixture.stopStopped, fixture.stopIdle]) {
      assert.throws(() => contract.parseStop(JSON.stringify(payload), code), contract.ContractError);
    }
  }
});

for (const available of [null, "/opt/homebrew/bin/glimmer", "/Applications/Glimmer.app/Contents/MacOS/Glimmer"]) {
  test(`stop CLI discovery with ${available ?? "no installed CLI"}`, async () => {
    const h = setup({ available });
    await h.command();
    if (available) {
      assert.equal(h.executions[0].path, available);
      assert.ok(!h.events.includes("glimmer://stop"));
    } else {
      assert.deepEqual(h.executions, []);
      assert.deepEqual(h.hud, []);
      assert.equal(h.events.at(-1), "glimmer://stop");
      assert.equal(h.toasts[0].title, "Stop requested via URL — CLI not installed");
      assert.match(h.toasts[0].message, /cannot be verified/);
    }
  });
}

test("a CLI removed after discovery permits the confirmed URL fallback", async () => {
  const h = setup({ executionError: Object.assign(new Error("Missing"), { code: "ENOENT" }) });
  await h.command();
  assert.equal(h.events.at(-1), "glimmer://stop");
  assert.match(h.toasts[0].title, /CLI not installed/);
});

for (const failure of [
  { accessError: Object.assign(new Error("Private access detail"), { code: "EACCES" }) },
  { executionError: Object.assign(new Error("Private execution detail"), { code: "EACCES" }) },
  { executionError: Object.assign(new Error("Private timeout detail"), { code: 5, killed: true }) },
  { executionError: Object.assign(new Error("Private signal detail"), { code: null, signal: "SIGTERM" }) },
]) {
  test(`permissions and interrupted execution do not trigger fallback: ${Object.keys(failure)[0]} ${Object.values(failure)[0].message}`, async () => {
    const h = setup(failure);
    await h.command();
    assert.equal(h.toasts[0].style, "failure");
    assert.ok(!h.events.includes("glimmer://stop"));
    assert.doesNotMatch(h.toasts[0].message, /Private/);
    if (failure.executionError?.killed) assert.match(h.toasts[0].message, /too long/);
  });
}

test("a failed URL open reports failure without claiming the stream stopped", async () => {
  const h = setup({ available: null, openError: new Error("Private URL detail") });
  await h.command();
  assert.deepEqual(h.hud, []);
  assert.equal(h.toasts[0].style, "failure");
  assert.match(h.toasts[0].message, /CLI is not installed.*link could not open/);
  assert.doesNotMatch(h.toasts[0].message, /Private/);
});

test("the menu bar uses the confirmed stop flow and refreshes status afterward", async () => {
  const h = setup();
  const { default: Status } = loadSource("../src/glimmer-status.tsx", {
    "@raycast/api": {
      ...h.api,
      Icon: {},
      MenuBarExtra: Object.assign(() => null, { Section: "section", Item: "item" }),
    },
    "@raycast/utils": {
      useCachedPromise: () => ({
        data: contract.parseStatus(JSON.stringify(fixture.statusLive)),
        mutate: async () => h.events.push("refresh"),
      }),
    },
    "./lib/contract": contract,
    "./lib/glimmer": h.glimmer,
    "./stop-streaming": { default: h.command },
    "./components/shared": {},
  });
  function findStop(node) {
    if (!node) return undefined;
    if (node?.props?.title === "Stop streaming") return node;
    return [node?.props?.children].flat().map(findStop).find(Boolean);
  }
  await findStop(Status()).props.onAction();
  assert.equal(h.events[0], "confirm");
  assert.equal(h.events.at(-1), "refresh");
  assert.deepEqual(h.hud, ["Stream stopped."]);
});

test("stream passes names as arguments without a shell or force flag", async () => {
  const h = setup({ stdout: "" });
  await h.glimmer.streamPC({ id: "pc-id", name: "Den PC" }, "Game + & name");
  assert.deepEqual(h.executions[0].args, ["stream", "pc-id", "Game + & name"]);
  assert.equal(h.executions[0].options.shell, false);
  assert.deepEqual(h.alerts, []);
});
