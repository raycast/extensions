import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile, rm, utimes } from "node:fs/promises";
import path from "node:path";
import { act } from "react-test-renderer";
import {
  host,
  mountCommand,
  action,
  invoke,
  flush,
  closeViews,
  viewText,
  records,
  saveRecovery,
  recoveryRecords,
  clearCompletedRecovery,
  speakText,
  MAX_RECOVERY_RECORDS,
  MAX_COMPLETED_RECORDS,
} from "./host-fixture.mjs";
import { id, job, json, wav } from "./fixtures.mjs";

let directory, originalFetch;
beforeEach(async () => {
  await mkdir(".test-tmp", { recursive: true });
  directory = await mkdtemp(path.resolve(".test-tmp/review-"));
  Object.assign(host, {
    supportPath: path.join(directory, "audio"),
    storage: {},
    storageFile: undefined,
    storageError: false,
    toasts: [],
    copied: [],
    played: [],
    selected: "Selected fixture",
    clipboard: "Copied fixture",
    preferences: { apiKey: "test-key", voiceName: "Kore" },
    onToast: undefined,
    playbackError: undefined,
    holdPlayback: false,
    closedWindow: false,
    confirmations: [],
    confirm: true,
  });
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("No network permitted");
  };
});
afterEach(async () => {
  await closeViews();
  globalThis.fetch = originalFetch;
  await rm(directory, { recursive: true, force: true });
});
async function until(check) {
  for (let i = 0; i < 500; i++) {
    if (check()) return;
    await flush();
  }
  throw new Error("Expected view state missing");
}
function record(state = "pending", offset = 0) {
  return { requestId: randomUUID(), state, createdAt: new Date(Date.UTC(2026, 0, 1) + offset * 1000).toISOString() };
}
function seed(values) {
  for (const value of values) host.storage["flowspeech.recovery." + value.requestId] = JSON.stringify(value);
}
function success() {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return init.method === "POST"
      ? json(job("success", { requestId: init.headers["Idempotency-Key"] }))
      : new Response(wav);
  };
  return calls;
}

test("all public command names use view mode, including hotkey launches", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  assert.deepEqual(
    manifest.commands.map(({ name, mode }) => [name, mode]),
    [
      ["speak-selected", "view"],
      ["speak-copied", "view"],
      ["show-recovery", "view"],
    ],
  );
});

for (const name of ["speak-selected", "speak-copied"]) {
  test(name + " exposes Stop Waiting and copy even when toasts have only HUD semantics", async () => {
    host.closedWindow = true;
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return json(job("queued", { requestId: init.headers["Idempotency-Key"] }), 202);
    };
    const view = await mountCommand(name);
    await until(() => calls.length === 1 && action(view, "Copy Request ID"));
    const saved = records()[0].requestId;
    assert.ok(host.toasts.every((toast) => toast.hud && !toast.primaryAction));
    host.closedWindow = false;
    await invoke(view, "Copy Request ID");
    assert.equal(host.closedWindow, false, "Copy must not hide the command or stop work");
    assert.equal(host.copied.at(-1), saved);
    assert.ok(action(view, "Stop Waiting"));
    await invoke(view, "Stop Waiting");
    await until(() => !action(view, "Stop Waiting"));
    assert.equal(calls.length, 1);
    assert.equal(records()[0].state, "interrupted");
    assert.ok(viewText(view).includes(saved));
  });
}

test("view Stop Playback aborts a running player and preserves its recovery ID", async () => {
  host.closedWindow = true;
  host.holdPlayback = true;
  const calls = success();
  const view = await mountCommand("speak-copied");
  await until(() => host.played.length === 1 && action(view, "Stop Playback"));
  assert.equal(records()[0].state, "pending", "Playing is not completed retention-eligible history");
  await invoke(view, "Stop Playback");
  await until(() => !action(view, "Stop Playback"));
  assert.equal(host.played[0].options.signal.aborted, true);
  assert.equal(records()[0].state, "interrupted");
  assert.equal(records()[0].jobId, id);
  assert.equal(calls.length, 2);
});

test("unmount aborts local waiting without cancelling or resubmitting a server job", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return json(job("queued", { requestId: init.headers["Idempotency-Key"] }), 202);
  };
  const view = await mountCommand("speak-selected");
  await until(() => calls.length === 1);
  await act(async () => {
    view.unmount();
  });
  await until(() => records()[0]?.state === "interrupted");
  assert.equal(calls.length, 1);
});

test("StrictMode effect replay and rerenders do not duplicate paid submission", async () => {
  const calls = success();
  const view = await mountCommand("speak-selected", false, true);
  await until(() => viewText(view).includes("Speech finished"));
  assert.equal(calls.filter(({ init }) => init.method === "POST").length, 1);
  assert.equal(records().length, 1);
});

test("recovery view offers copy actions without relying on a toast or network", async () => {
  const saved = record("interrupted");
  seed([saved]);
  host.closedWindow = true;
  const view = await mountCommand("show-recovery");
  await until(() => action(view, "Copy All Recovery IDs"));
  assert.equal(host.toasts.length, 0);
  await invoke(view, "Copy All Recovery IDs");
  assert.ok(host.copied.at(-1).includes(saved.requestId));
});

test("501 completed writes retain the newest 50 without evicting unresolved IDs", async () => {
  const protectedRecords = [record("pending"), record("interrupted")];
  seed(protectedRecords);
  let latest;
  for (let i = 0; i < 501; i++) {
    latest = record("completed", i + 1);
    await saveRecovery(latest);
  }
  const remaining = await recoveryRecords();
  assert.equal(remaining.length, MAX_COMPLETED_RECORDS + 2);
  for (const value of [...protectedRecords, latest])
    assert.ok(remaining.some((item) => item.requestId === value.requestId));
});

test("full unresolved history blocks submission, but existing status updates remain writable", async () => {
  const saved = Array.from({ length: MAX_RECOVERY_RECORDS }, () => record());
  seed(saved);
  const calls = success();
  await speakText(async () => "Fixture");
  assert.equal(calls.length, 0);
  assert.match(host.toasts.at(-1).message, /storage is full/);
  await saveRecovery({ ...saved[0], state: "interrupted" });
  assert.equal(records().length, MAX_RECOVERY_RECORDS);
  for (const value of saved) assert.ok(records().some((item) => item.requestId === value.requestId));
});

test("concurrent reservations cannot exceed capacity or overwrite each other", async () => {
  seed(Array.from({ length: MAX_RECOVERY_RECORDS - 1 }, () => record()));
  const outcomes = await Promise.allSettled(Array.from({ length: 10 }, () => saveRecovery(record())));
  assert.equal(outcomes.filter((value) => value.status === "fulfilled").length, 1);
  assert.equal(records().length, MAX_RECOVERY_RECORDS);
});

test("independent command processes serialize the last available recovery slot", async () => {
  seed(Array.from({ length: MAX_RECOVERY_RECORDS - 1 }, () => record()));
  const storageFile = path.join(directory, "storage.json");
  await writeFile(storageFile, JSON.stringify(host.storage), { mode: 0o600 });
  const children = Array.from({ length: 2 }, () =>
    fork(new URL("./recovery-process.mjs", import.meta.url), [directory, storageFile, randomUUID()], {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    }),
  );
  try {
    await Promise.all(children.map((child) => once(child, "message")));
    const done = children.map((child) => once(child, "exit"));
    const replies = children.map((child) => once(child, "message"));
    for (const child of children) child.send("start");
    const results = await Promise.all(replies);
    await Promise.all(done);
    assert.equal(results.filter(([result]) => result.saved).length, 1);
    assert.equal(Object.keys(JSON.parse(await readFile(storageFile, "utf8"))).length, MAX_RECOVERY_RECORDS);
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill();
  }
});

test("stale lock after an interrupted host is reclaimed without deleting IDs", async () => {
  const saved = record();
  seed([saved]);
  const lock = path.join(host.supportPath, "recovery-store.lock");
  await mkdir(lock, { recursive: true });
  const old = new Date(Date.now() - 60000);
  await utimes(lock, old, old);
  await saveRecovery(record());
  assert.equal(records().length, 2);
  assert.ok(records().some((item) => item.requestId === saved.requestId));
});

test("bulk completed cleanup preserves pending, interrupted and unrelated storage", async () => {
  const pending = record(),
    interrupted = record("interrupted");
  seed([pending, interrupted, record("completed")]);
  host.storage.unrelated = "preserve";
  await clearCompletedRecovery();
  assert.deepEqual(
    (await recoveryRecords()).map((item) => item.requestId).sort(),
    [pending.requestId, interrupted.requestId].sort(),
  );
  assert.equal(host.storage.unrelated, "preserve");
});

test("legacy oversized unresolved history is retained and blocks new requests", async () => {
  seed(Array.from({ length: 251 }, () => record()));
  await assert.rejects(saveRecovery(record()), /storage is full/);
  assert.equal((await recoveryRecords()).length, 251);
});

test("recovery view pages large history and confirms any explicit forgetting", async () => {
  seed(Array.from({ length: 60 }, (_, i) => record("pending", i)));
  const view = await mountCommand("show-recovery");
  await until(() => action(view, "Show More"));
  assert.equal(view.root.findAllByType("List.Item").length, 50);
  await invoke(view, "Show More");
  assert.equal(view.root.findAllByType("List.Item").length, 60);
  host.confirm = false;
  await invoke(view, "Forget This Recovery ID");
  assert.equal(records().length, 60);
  assert.match(host.confirmations[0].message, /does not cancel/);
  host.confirm = true;
  await invoke(view, "Forget This Recovery ID");
  assert.equal(records().length, 59);
});

test("view clear-completed action requires confirmation and cannot clear pending IDs", async () => {
  const pending = record();
  seed([pending, record("completed")]);
  const view = await mountCommand("show-recovery");
  await until(() => action(view, "Clear Completed History"));
  host.confirm = false;
  await invoke(view, "Clear Completed History");
  assert.equal(records().length, 2);
  host.confirm = true;
  await invoke(view, "Clear Completed History");
  assert.equal(records().length, 1);
  assert.equal(records()[0].requestId, pending.requestId);
});
