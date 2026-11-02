import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  host,
  speakText,
  saveRecovery,
  updateRecovery,
  forgetRecovery,
  recoveryRecords,
  recoveryCommand,
  records,
  closeViews,
  invoke,
} from "./host-fixture.mjs";
import { id, job, json, wav } from "./fixtures.mjs";

const { LocalStorage } = createRequire(import.meta.url)("@raycast/api");
const storageMethods = { ...LocalStorage };
let directory, originalFetch;
beforeEach(async () => {
  await mkdir(".test-tmp", { recursive: true });
  directory = await mkdtemp(path.resolve(".test-tmp/forgotten-"));
  Object.assign(host, {
    supportPath: path.join(directory, "audio"),
    storage: {},
    storageFile: undefined,
    storageError: false,
    toasts: [],
    copied: [],
    played: [],
    onToast: undefined,
    onPlayback: undefined,
    playbackError: undefined,
    holdPlayback: false,
    closedWindow: false,
    preferences: { apiKey: "test-key", voiceName: "Kore" },
  });
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Unexpected network access");
  };
});
afterEach(async () => {
  host.onPlayback = undefined;
  Object.assign(LocalStorage, storageMethods);
  await closeViews();
  globalThis.fetch = originalFetch;
  await rm(directory, { recursive: true, force: true });
});
const record = (state = "pending") => ({ requestId: randomUUID(), state, createdAt: "2026-10-28T00:00:00Z" });
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

for (const state of ["pending", "completed", "interrupted"]) {
  test("absent " + state + " update neither writes nor prunes existing history", async () => {
    const forgotten = record();
    await saveRecovery(forgotten);
    await forgetRecovery(forgotten.requestId);
    for (let i = 0; i < 60; i++) {
      const saved = record("completed");
      host.storage["flowspeech.recovery." + saved.requestId] = JSON.stringify(saved);
    }
    const before = { ...host.storage };
    let mutations = 0;
    LocalStorage.setItem = async () => {
      mutations++;
    };
    LocalStorage.removeItem = async () => {
      mutations++;
    };
    await updateRecovery({ ...forgotten, state, jobId: id });
    assert.equal(mutations, 0);
    assert.deepEqual(host.storage, before);
  });
}

test("updates remain serialized with forgetting when an update already holds the store lock", async () => {
  const saved = record();
  await saveRecovery(saved);
  const entered = deferred(),
    resume = deferred();
  LocalStorage.allItems = async () => {
    entered.resolve();
    await resume.promise;
    return storageMethods.allItems();
  };
  const update = updateRecovery({ ...saved, state: "completed" });
  await entered.promise;
  const forget = forgetRecovery(saved.requestId);
  resume.resolve();
  await Promise.all([update, forget]);
  assert.deepEqual(records(), []);
});

test("update queued behind forgetting cannot recreate the removed record", async () => {
  const saved = record();
  await saveRecovery(saved);
  const entered = deferred(),
    resume = deferred();
  LocalStorage.removeItem = async (key) => {
    entered.resolve();
    await resume.promise;
    return storageMethods.removeItem(key);
  };
  const forget = forgetRecovery(saved.requestId);
  await entered.promise;
  const update = updateRecovery({ ...saved, state: "interrupted" });
  resume.resolve();
  await Promise.all([forget, update]);
  assert.deepEqual(records(), []);
});

for (const stage of ["create", "download", "playback"]) {
  for (const outcome of ["completed", "interrupted"]) {
    for (const overlapping of [false, true]) {
      test(`${stage} forgotten operation stays absent after ${outcome}${overlapping ? " with another operation" : ""}`, async () => {
        const entered = deferred(),
          resume = deferred();
        const controller = new AbortController();
        let forgottenId,
          posts = 0;
        async function hold() {
          entered.resolve();
          await resume.promise;
          if (outcome === "interrupted") throw new Error("Synthetic interruption");
        }
        globalThis.fetch = async (url, init = {}) => {
          if (init.method === "POST") {
            posts++;
            const target = JSON.parse(init.body).input.text === "Forgotten fixture";
            if (target) forgottenId = init.headers["Idempotency-Key"];
            if (target && stage === "create") await hold();
            return json(
              job("success", {
                requestId: init.headers["Idempotency-Key"],
                result: {
                  ...job("success").result,
                  url: target ? "https://audio.example.test/forgotten.wav" : "https://audio.example.test/other.wav",
                },
              }),
            );
          }
          if (String(url).endsWith("/forgotten.wav") && stage === "download") await hold();
          return new Response(wav);
        };
        host.onPlayback = (options, callback) => {
          if (stage !== "playback" || !options.signal || host.played.at(-1).args[0].includes(forgottenId) === false) {
            callback(null, "", "");
            return;
          }
          entered.resolve();
          void resume.promise.then(() =>
            callback(options.signal.aborted ? new Error("Synthetic playback interruption") : null, "", ""),
          );
        };
        const operation = speakText(async () => "Forgotten fixture", controller.signal);
        try {
          await entered.promise;
          assert.ok(records().some((r) => r.requestId === forgottenId));
          await forgetRecovery(forgottenId);
          assert.ok(!records().some((r) => r.requestId === forgottenId));
          if (overlapping) await speakText(async () => "Other fixture");
        } finally {
          if (outcome === "interrupted") controller.abort();
          resume.resolve();
          await operation;
        }
        assert.ok(!records().some((r) => r.requestId === forgottenId));
        assert.equal(posts, overlapping ? 2 : 1);
        assert.equal(records().length, overlapping ? 1 : 0);
        if (overlapping) assert.equal(records()[0].state, "completed");
        assert.deepEqual(await readdir(host.supportPath), []);
      });
    }
  }
}

test("ordinary initial save and later updates remain recoverable and copyable", async () => {
  const saved = record();
  await saveRecovery(saved);
  await updateRecovery({ ...saved, jobId: id });
  await updateRecovery({ ...saved, jobId: id, state: "interrupted" });
  assert.deepEqual(await recoveryRecords(), [{ ...saved, jobId: id, state: "interrupted" }]);
  await recoveryCommand();
  await invoke(host.recoveryView, "Copy All Recovery IDs");
  assert.ok(host.copied.at(-1).includes(saved.requestId));
  assert.ok(host.copied.at(-1).includes(id));
  assert.ok(!host.copied.at(-1).includes("test-key"));
});
