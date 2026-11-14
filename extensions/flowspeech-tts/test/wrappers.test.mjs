import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, readdir, writeFile, readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { fork } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  host,
  speakText,
  generateSpeech,
  toWav,
  selectedCommand,
  copiedCommand,
  recoveryCommand,
  recoveryRecords,
  saveRecovery,
  errorJobId,
  records,
  closeViews,
  viewText,
  invoke,
} from "./host-fixture.mjs";
import { id, requestId, input, job, json, wav } from "./fixtures.mjs";

let directory;
let originalFetch;
beforeEach(async () => {
  await mkdir(".test-tmp", { recursive: true });
  directory = await mkdtemp(path.resolve(".test-tmp/wrappers-"));
  Object.assign(host, {
    supportPath: path.join(directory, "audio"),
    storage: {},
    storageFile: undefined,
    storageError: false,
    toasts: [],
    copied: [],
    played: [],
    selected: "Selected words",
    clipboard: "Copied words",
    onToast: undefined,
    playbackError: undefined,
    holdPlayback: false,
    confirm: true,
    confirmations: [],
    preferences: { apiKey: "test-key", voiceName: "Kore" },
  });
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Unexpected network access in wrapper test");
  };
});
afterEach(async () => {
  await closeViews();
  globalThis.fetch = originalFetch;
  await rm(directory, { recursive: true, force: true });
});
function successTransport({ onPost, audio = wav, status = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (init.method === "POST") {
      await onPost?.(init);
      return json(job("success", { requestId: init.headers["Idempotency-Key"] }));
    }
    assert.equal(String(url), "https://audio.example.test/result.wav");
    assert.equal(init.headers, undefined);
    assert.equal(init.credentials, "omit");
    return new Response(audio, { status });
  };
  return calls;
}
async function eventually(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await delay(5);
  }
  throw new Error("Expected test event did not occur");
}

test("actual API wrapper passes caller UUID and signal, returns recovery IDs and validated WAV", async () => {
  const calls = successTransport();
  const controller = new AbortController();
  const audio = await generateSpeech(input.text, input.voiceName, "test-key", requestId, controller.signal);
  assert.equal(audio.requestId, requestId);
  assert.equal(audio.jobId, id);
  assert.deepEqual(audio.audio, wav);
  assert.equal(calls[0].init.headers["Idempotency-Key"], requestId);
  assert.deepEqual(JSON.parse(calls[0].init.body), { input });
  assert.equal(toWav(audio), audio.audio);
});

test("actual API wrapper rejects missing UUID and pre-aborted signals before HTTP", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("network forbidden");
  };
  await assert.rejects(generateSpeech("Hello", "Kore", "test-key"), /UUID/);
  await assert.rejects(generateSpeech("Hello", "Kore", "test-key", requestId, AbortSignal.abort()), /stopped/);
  assert.equal(calls, 0);
});

for (const command of [selectedCommand, copiedCommand]) {
  test(
    "actual " + command.name + " wrapper persists UUID before POST, validates audio and cleans private file",
    async () => {
      const expected = command === selectedCommand ? host.selected : host.clipboard;
      const calls = successTransport({
        onPost: (init) => {
          const [record] = records();
          assert.equal(record.requestId, init.headers["Idempotency-Key"]);
          assert.equal(record.state, "pending");
          assert.ok(!JSON.stringify(record).includes("test-key"));
          assert.ok(!JSON.stringify(record).includes(expected));
          const file = path.join(host.supportPath, "flowspeech-" + record.requestId + ".wav");
          assert.equal(statSync(file).mode & 0o777, 0o600);
          assert.equal(statSync(file).size, 0);
          assert.ok(host.toasts[0].message.includes(record.requestId));
        },
      });
      await command();
      assert.equal(JSON.parse(calls[0].init.body).input.text, expected);
      assert.equal(records()[0].state, "completed");
      assert.equal(records()[0].jobId, id);
      assert.equal(host.played.length, 1);
      assert.equal(host.played[0].file, "/usr/bin/afplay");
      assert.deepEqual(host.played[0].audio, wav);
      assert.deepEqual(await readdir(host.supportPath), []);
      assert.equal(calls.filter((call) => call.init.method === "POST").length, 1);
    },
  );
}

for (const value of ["", undefined, "  ", "x".repeat(10001)]) {
  test("bad text fails before storage and submission: " + String(value).slice(0, 12), async () => {
    await speakText(async () => value);
    assert.deepEqual(records(), []);
    assert.equal(host.played.length, 0);
    assert.equal(host.toasts.at(-1).style, "failure");
  });
}

test("storage failure prevents any paid submission and removes reserved audio", async () => {
  host.storageError = true;
  await selectedCommand();
  assert.equal(records().length, 0);
  assert.deepEqual(await readdir(host.supportPath), []);
  assert.match(host.toasts.at(-1).message, /Storage unavailable/);
});

test("unwritable output parent fails before storage or submission", async () => {
  await writeFile(host.supportPath, "not a directory");
  await copiedCommand();
  assert.equal(records().length, 0);
  assert.equal(host.played.length, 0);
});

for (const kind of ["external signal", "toast stop"]) {
  test(kind + " stops local work while retaining and showing the caller-known UUID", async () => {
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return json(job("queued", { requestId: init.headers["Idempotency-Key"] }), 202);
    };
    const controller = new AbortController();
    const pending = speakText(async () => "Do not duplicate this recording", controller.signal);
    await eventually(() => calls.length === 1);
    await delay(5);
    if (kind === "external signal") controller.abort();
    else host.toasts[0].primaryAction.onAction();
    await pending;
    const record = records()[0];
    assert.equal(record.state, "interrupted");
    assert.equal(record.jobId, id);
    assert.equal(calls.length, 1);
    assert.ok(!calls.some((call) => String(call.url).endsWith("/cancel")));
    assert.match(host.toasts.at(-1).message, /server job was not cancelled/);
    assert.ok(host.toasts.at(-1).message.includes(record.requestId));
    host.toasts.at(-1).primaryAction.onAction();
    assert.equal(host.copied.at(-1), record.requestId);
    assert.deepEqual(await readdir(host.supportPath), []);
    await recoveryCommand();
    assert.ok(viewText(host.recoveryView).includes(record.requestId));
    assert.equal(calls.length, 1);
  });
}

test("pre-aborted speakText neither creates a recovery record nor claims it saved one", async () => {
  await speakText(async () => "Hello", AbortSignal.abort());
  assert.equal(records().length, 0);
  assert.equal(host.toasts.at(-1).title, "Speech stopped");
});

test("download failure keeps both IDs without resubmission or playback", async () => {
  const calls = successTransport({ status: 503 });
  await selectedCommand();
  assert.equal(calls.length, 2);
  assert.equal(records()[0].jobId, id);
  assert.equal(records()[0].state, "interrupted");
  assert.equal(host.played.length, 0);
});

test("header-only WAV is refused by actual wrappers and never played", async () => {
  successTransport({ audio: Buffer.from("RIFF\x04\x00\x00\x00WAVE") });
  await copiedCommand();
  assert.equal(host.played.length, 0);
  assert.equal(records()[0].state, "interrupted");
  assert.throws(() =>
    toWav({
      audio: Buffer.from("RIFF\x04\x00\x00\x00WAVE"),
      mimeType: "audio/wav",
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
    }),
  );
});

test("playback failure retains IDs, redacts key and text, and cleans audio", async () => {
  successTransport();
  host.playbackError = new Error("test-key Selected words");
  await selectedCommand();
  const message = host.toasts.at(-1).message;
  assert.ok(!message.includes("test-key") && !message.includes("Selected words"));
  assert.ok(message.includes(records()[0].requestId));
  assert.deepEqual(await readdir(host.supportPath), []);
});

test("concurrent commands keep separate durable recovery records", async () => {
  successTransport();
  await Promise.all([speakText(async () => host.selected), speakText(async () => host.clipboard)]);
  assert.equal(records().length, 2);
  assert.equal(new Set(records().map((record) => record.requestId)).size, 2);
  assert.equal(host.played.length, 2);
});

test("recovery command is read-only, ignores malformed data, and copies only IDs and metadata", async () => {
  await saveRecovery({ requestId, createdAt: "2026-10-26T00:00:00Z", state: "interrupted" });
  host.storage["unrelated"] = "test-key";
  host.storage["flowspeech.recovery.bad"] = "{broken";
  host.storage["flowspeech.recovery." + id] = JSON.stringify({ requestId, state: "pending", createdAt: "invalid" });
  assert.equal((await recoveryRecords()).length, 1);
  await recoveryCommand();
  await invoke(host.recoveryView, "Copy All Recovery IDs");
  assert.ok(host.copied[0].includes(requestId));
  assert.ok(!host.copied[0].includes("test-key"));
  assert.equal(errorJobId(new Error("failure; jobId=" + id)), id);
  assert.equal(errorJobId(new Error("failure; jobId=../escape")), undefined);
});

test("empty recovery command does not generate speech", async () => {
  await recoveryCommand();
  assert.ok(viewText(host.recoveryView).includes("No saved speech requests"));
});

test("later storage failures cannot remove the durable pre-submission UUID", async () => {
  successTransport({
    onPost: () => {
      host.storageError = true;
    },
  });
  await selectedCommand();
  assert.equal(records().length, 1);
  assert.equal(records()[0].state, "pending");
  assert.equal(host.played.length, 1);
  await recoveryCommand();
  assert.ok(viewText(host.recoveryView).includes(records()[0].requestId));
});

test("stop playback aborts before starting the player without cancelling the completed job", async () => {
  const calls = successTransport();
  host.onToast = (toast) => {
    if (toast.title === "Playing with FlowSpeech") toast.primaryAction.onAction();
  };
  await selectedCommand();
  assert.equal(host.played.length, 0);
  assert.equal(records()[0].state, "interrupted");
  assert.equal(records()[0].jobId, id);
  assert.equal(calls.length, 2);
  assert.deepEqual(await readdir(host.supportPath), []);
});

test("abrupt simulated host termination leaves UUID recoverable in a fresh command process", async () => {
  const storageFile = path.join(directory, "mock-storage.json");
  const childFile = new URL("./host-process.mjs", import.meta.url);
  const child = fork(childFile, ["generate", directory, storageFile], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
  let saved;
  try {
    const event = await Promise.race([
      once(child, "message"),
      once(child, "exit").then(() => {
        throw new Error("Child exited before submission");
      }),
      delay(5000, undefined, { ref: false }).then(() => {
        throw new Error("Host fixture timed out");
      }),
    ]);
    saved = event[0];
    assert.equal(saved.phase, "submitted");
  } finally {
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
  }
  const stored = Object.values(JSON.parse(await readFile(storageFile, "utf8"))).map(JSON.parse);
  assert.equal(stored[0].requestId, saved.requestId);
  assert.equal(stored[0].state, "pending");
  const resumed = fork(childFile, ["recover", directory, storageFile], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
  const completed = once(resumed, "exit");
  const [recovered] = await once(resumed, "message");
  await completed;
  assert.equal(recovered.phase, "recovered");
  assert.ok(recovered.message.includes(saved.requestId));
  assert.equal(recovered.requests, 0);
});
