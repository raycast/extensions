import assert from "node:assert/strict";
import { test } from "node:test";
import { launcherApps } from "../src/lib/contract.ts";
import { loadSource } from "./helpers/load-source.mjs";

test("the launcher hides hidden apps except the running app, without changing source order", () => {
  const apps = [
    { id: 1, hidden: false, running: false },
    { id: 2, hidden: true, running: false },
    { id: 3, hidden: true, running: true },
    { id: 4, hidden: false, running: false },
  ];
  assert.deepEqual(
    launcherApps(apps, false).map((app) => app.id),
    [3, 1, 4],
  );
  assert.deepEqual(
    launcherApps(apps, true).map((app) => app.id),
    [3, 1, 2, 4],
  );
  assert.deepEqual(
    apps.map((app) => app.id),
    [1, 2, 3, 4],
  );
});

function setup({ wake = async () => {}, stream = async () => {} } = {}) {
  const events = [];
  const toast = {};
  const { wakeWithToast, streamWithToast } = loadSource("../src/components/shared.tsx", {
    "@raycast/api": {
      Toast: { Style: { Animated: "working", Success: "success", Failure: "failure" } },
      showToast: async (options) => Object.assign(toast, options),
      closeMainWindow: async () => events.push("close"),
    },
    "../lib/contract": {},
    "../lib/glimmer": {
      wakePC: async (pc) => {
        events.push(`wake:${pc.id}`);
        await wake();
      },
      streamPC: async (pc, app) => {
        events.push(["stream", pc.id, app]);
        await stream();
      },
      errorMessage: (error) => error.message,
    },
  });
  const pc = { id: "pc-id", name: "Den PC", state: "asleep" };
  return { wakeWithToast, streamWithToast, pc, toast, events, refresh: async () => events.push("refresh") };
}

test("wake and stream waits for the PC and suppresses duplicate wake requests", async () => {
  let finishWake;
  const waiting = new Promise((resolve) => {
    finishWake = resolve;
  });
  const h = setup({ wake: () => waiting });
  const pending = h.streamWithToast(h.pc, "Steam");
  await Promise.resolve();
  await h.streamWithToast(h.pc, "Steam");
  assert.deepEqual(h.events, ["wake:pc-id"]);
  finishWake();
  await pending;
  assert.deepEqual(h.events, ["wake:pc-id", ["stream", "pc-id", "Steam"], "close"]);
  assert.equal(h.toast.title, "Stream requested");
  assert.equal(h.toast.style, "success");
});

test("a failed wake never requests a stream and permits retry", async () => {
  const h = setup({
    wake: async () => {
      throw new Error("PC did not answer");
    },
  });
  for (let attempt = 0; attempt < 2; attempt++) await h.streamWithToast(h.pc);
  assert.deepEqual(h.events, ["wake:pc-id", "wake:pc-id"]);
  assert.equal(h.toast.style, "failure");
  assert.equal(h.toast.title, "Couldn’t wake Den PC");
});

test("a failed launch reports that wake succeeded, without claiming playback", async () => {
  const h = setup({
    stream: async () => {
      throw new Error("Glimmer couldn’t complete the request. Open Glimmer and try again.");
    },
  });
  await h.streamWithToast(h.pc);
  assert.equal(h.toast.style, "failure");
  assert.equal(h.toast.title, "Couldn’t start streaming");
  assert.doesNotMatch(h.toast.message, /Private/);
  assert.ok(!h.events.includes("close"));
});

test("wake-only never opens a stream", async () => {
  const h = setup();
  await h.wakeWithToast(h.pc, h.refresh);
  assert.deepEqual(h.events, ["wake:pc-id", "refresh"]);
  assert.equal(h.toast.title, "Den PC is awake");
});

test("a ready PC launches directly without wake or an external URL prompt", async () => {
  const h = setup();
  await h.streamWithToast({ ...h.pc, state: "ready" }, "Steam Big Picture");
  assert.deepEqual(h.events, [["stream", "pc-id", "Steam Big Picture"], "close"]);
});
