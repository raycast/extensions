import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import {
  FlowSpeechClient,
  dialogueInput,
  validateId,
  validateWav,
  id,
  requestId,
  input,
  result,
  wav,
  job,
  json,
  brokenResponse,
  harness,
  chunk,
  riff,
  format,
} from "./fixtures.mjs";

test("single creation, all pending states and credential-free audio", async () => {
  const h = harness(
    ["queued", "running", "merging", "settling"]
      .map((state) => json(job(state), 202, { "Retry-After": "8" }))
      .concat([json(job()), new Response(wav)]),
  );
  const completed = await h.client.generate(input, requestId);
  assert.deepEqual(completed.audio, wav);
  assert.equal(completed.requestId, requestId);
  assert.deepEqual(h.sleeps, [8000, 8000, 8000, 8000]);
  assert.equal(h.calls[0].url, "https://flowspeech.io/api/v1/tts/jobs");
  assert.deepEqual(JSON.parse(h.calls[0].init.body), { input });
  assert.equal(h.calls[0].init.headers["Idempotency-Key"], requestId);
  for (const call of h.calls.slice(0, -1)) assert.equal(call.init.headers.Authorization, "Bearer test-key");
  assert.equal(h.calls.at(-1).init.headers, undefined);
  assert.ok(h.calls.every((call) => call.init.redirect === "manual" && call.init.credentials === "omit"));
});
test("network retries preserve the exact body and UUID", async () => {
  const h = harness([new Error("network"), json(job()), new Response(wav)]);
  await h.client.generate(input, requestId);
  assert.equal(h.calls[0].init.body, h.calls[1].init.body);
  assert.equal(h.calls[0].init.headers["Idempotency-Key"], h.calls[1].init.headers["Idempotency-Key"]);
  assert.deepEqual(h.sleeps, [1000]);
});
test("429 and retryable 503 honor Retry-After", async () => {
  const h = harness([
    json({ error: { retryable: true } }, 429, { "Retry-After": "9" }),
    json({ error: { retryable: true } }, 503, { "Retry-After": "12" }),
    json(job()),
    new Response(wav),
  ]);
  await h.client.generate(input, requestId);
  assert.deepEqual(h.sleeps, [9000, 12000]);
  assert.equal(new Set(h.calls.slice(0, 3).map((call) => call.init.body)).size, 1);
});
test("HTTP-date Retry-After is honored", async () => {
  const h = harness([
    json(job("queued"), 202, { "Retry-After": new Date(Date.now() + 15000).toUTCString() }),
    json(job()),
    new Response(wav),
  ]);
  await h.client.generate(input, requestId);
  assert.ok(h.sleeps[0] >= 13000);
});
for (const status of [200, 429, 503])
  test("body-read failure preserves Retry-After on HTTP " + status, async () => {
    const h = harness([brokenResponse(status, { "Retry-After": "20" }), json(job()), new Response(wav)]);
    await h.client.generate(input, requestId);
    assert.deepEqual(h.sleeps, [20000]);
    assert.equal(h.calls[0].init.body, h.calls[1].init.body);
  });
test("body-read failure honors a dated cooldown", async () => {
  const h = harness([
    brokenResponse(429, { "Retry-After": new Date(Date.now() + 15000).toUTCString() }),
    json(job()),
    new Response(wav),
  ]);
  await h.client.generate(input, requestId);
  assert.ok(h.sleeps[0] >= 13000);
});
for (const failed of [
  () => new Error("network"),
  () => brokenResponse(),
  () => json({ error: { retryable: true } }, 429, { "Retry-After": "1" }),
]) {
  test("every status retry waits at least five seconds: " + failed.toString(), async () => {
    const h = harness([json(job("queued"), 202), failed(), json(job()), new Response(wav)]);
    await h.client.generate(input, requestId);
    assert.deepEqual(h.sleeps, [5000, 5000]);
    assert.equal(h.calls[2].at - h.calls[1].at, 5000);
  });
}
test("long required cooldown exceeds deadline without another request", async () => {
  const h = harness([brokenResponse(429, { "Retry-After": "20" })], { timeoutMs: 10000 });
  await assert.rejects(h.client.generate(input, requestId), /Required wait.*requestId=/);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.sleeps, []);
});
test("multi input preserves turn order and continuation text", async () => {
  const multi = dialogueInput("Speaker1: Hello\nMore text\nSpeaker2: Hi\nSpeaker1: Bye", "Charon", "Kore");
  assert.deepEqual(
    multi.segments.map((segment) => segment.voiceName),
    ["Charon", "Kore", "Charon"],
  );
  assert.equal(multi.segments[0].text, "Hello\nMore text");
  const h = harness([json(job()), new Response(wav)]);
  await h.client.generate(multi, requestId);
  assert.deepEqual(JSON.parse(h.calls[0].init.body), { input: multi });
  assert.throws(() => dialogueInput("unlabelled", "Kore", "Charon"));
  assert.throws(() => dialogueInput("Speaker1:", "Kore", "Charon"));
});
for (const status of ["failed", "cancelled"])
  test(status + " is not success even with HTTP 200", async () => {
    const h = harness([json(job(status, { error: { code: "TTS_STOPPED" } }))]);
    await assert.rejects(
      h.client.generate(input, requestId),
      new RegExp("Generation " + status + ": TTS_STOPPED.*jobId=" + id),
    );
    assert.equal(h.calls.length, 1);
  });
test("deleted success is readable but cannot generate audio", async () => {
  const deleted = job("success", { result: null, resultDeleted: true });
  const h = harness([json(deleted), json(deleted)]);
  assert.equal((await h.client.getJob(id)).resultDeleted, true);
  await assert.rejects(h.client.generate(input, requestId), /deleted.*jobId=/);
  assert.equal(h.calls.length, 2);
});
for (const [name, patch] of [
  ["unknown status", { status: "complete" }],
  ["missing ID", { id: undefined }],
  ["invalid ID type", { id: 42 }],
  ["missing request ID", { requestId: undefined }],
  ["null result", { result: null }],
  ["missing result", { result: undefined }],
  ["inconsistent deletion", { resultDeleted: true }],
  ["invalid deletion flag", { resultDeleted: "true" }],
  ["missing usage", { usage: undefined }],
  ["empty usage", { usage: {} }],
  ["negative usage", { usage: { billableCharacters: -1, reservedCredits: 0, chargedCredits: 0 } }],
  ["invalid error", { error: { code: "private text with spaces" } }],
])
  test("rejects " + name, async () => {
    const h = harness([json(job("success", patch))]);
    await assert.rejects(h.client.generate(input, requestId));
    assert.equal(h.calls.length, 1);
  });
for (const key of ["url", "mimeType", "sampleRate", "channels", "bitsPerSample", "access"]) {
  test("rejects missing result metadata " + key, async () => {
    const metadata = { ...result };
    delete metadata[key];
    const h = harness([json(job("success", { result: metadata }))]);
    await assert.rejects(h.client.generate(input, requestId), /metadata/);
    assert.equal(h.calls.length, 1);
  });
}
for (const [key, value] of [
  ["mimeType", "audio/mpeg"],
  ["sampleRate", 48000],
  ["channels", 2],
  ["bitsPerSample", 8],
  ["access", "private"],
  ["channels", true],
  ["sampleRate", "24000"],
]) {
  test("rejects incorrect result metadata " + key + "=" + value, async () => {
    const h = harness([json(job("success", { result: { ...result, [key]: value } }))]);
    await assert.rejects(h.client.generate(input, requestId), /metadata/);
    assert.equal(h.calls.length, 1);
  });
}
test("validates getJob and request-lookup response identities", async () => {
  const different = harness([json(job("success", { id: requestId }))]);
  await assert.rejects(different.client.getJob(id), /changed the job ID/);
  const wrongRequest = harness([json(job("success", { requestId: id }))]);
  await assert.rejects(wrongRequest.client.findJob(requestId), /changed the request ID/);
});
test("creation and polls reject different request identities before download", async () => {
  const create = harness([json(job("success", { requestId: id }))]);
  await assert.rejects(create.client.generate(input, requestId), /changed the request ID/);
  assert.equal(create.calls.length, 1);
  const poll = harness([json(job("queued")), json(job("success", { requestId: id }))]);
  await assert.rejects(poll.client.generate(input, requestId), /changed the request ID/);
  assert.equal(poll.calls.length, 2);
});
test("poll rejects changed job identity", async () => {
  const h = harness([json(job("queued")), json(job("success", { id: requestId }))]);
  await assert.rejects(h.client.generate(input, requestId), /changed the job ID/);
});
test("normalizes uppercase request and job UUIDs across all operations", async () => {
  const upper = job("success", { id: id.toUpperCase(), requestId: requestId.toUpperCase() });
  const h = harness([json(upper), new Response(wav), json(upper), json(upper)]);
  const completed = await h.client.generate(input, requestId.toUpperCase());
  assert.equal(completed.requestId, requestId);
  assert.equal(completed.job.id, id);
  assert.equal(completed.job.requestId, requestId);
  assert.equal(h.calls[0].init.headers["Idempotency-Key"], requestId);
  assert.equal((await h.client.getJob(id.toUpperCase())).id, id);
  assert.equal((await h.client.findJob(requestId.toUpperCase())).requestId, requestId);
  assert.equal(h.calls[2].url, "https://flowspeech.io/api/v1/tts/jobs/" + id);
  assert.equal(h.calls[3].url, "https://flowspeech.io/api/v1/tts/jobs?requestId=" + requestId);
});
for (const bad of [undefined, null, 42, "", "../quota", "not-a-uuid"])
  test("rejects invalid caller UUID " + bad, async () => {
    const h = harness([]);
    await assert.rejects(h.client.generate(input, bad));
    await assert.rejects(h.client.getJob(bad));
    await assert.rejects(h.client.findJob(bad));
    assert.equal(h.calls.length, 0);
  });
for (const key of ["model", "source", "speed", "format", "speakers", "originalText"])
  test("rejects obsolete input field " + key, async () => {
    const h = harness([]);
    await assert.rejects(h.client.generate({ ...input, [key]: "unsupported" }, requestId), /Unsupported/);
    assert.equal(h.calls.length, 0);
  });
for (const invalid of [
  null,
  [],
  { ...input, mode: "other" },
  { ...input, text: 42 },
  { ...input, text: " " },
  { ...input, voiceName: null },
  { ...input, text: "x".repeat(100001) },
  { mode: "multi", segments: [] },
  { mode: "multi", segments: [{ speaker: "", text: "Hi", voiceName: "Kore" }] },
  { mode: "multi", segments: [{ speaker: "A", text: "Hi", voiceName: "Kore", speed: 2 }] },
  {
    mode: "multi",
    segments: [
      { speaker: "A", text: "Hi", voiceName: "Kore" },
      { speaker: "A", text: "Hi", voiceName: "Puck" },
    ],
  },
])
  test("strict speech runtime validation: " + JSON.stringify(invalid).slice(0, 90), async () => {
    const h = harness([]);
    await assert.rejects(h.client.generate(invalid, requestId));
    assert.equal(h.calls.length, 0);
  });
test("quota, voices and lookup use authenticated v1 reads", async () => {
  const quota = { total: 20, remaining: 20, reserved: 5, available: 15 };
  const h = harness([
    json({ quota, subscription: null, limits: {} }),
    json({ voices: [{ name: "Kore", gender: "female", description: "Firm" }] }),
    json(job()),
  ]);
  assert.equal((await h.client.quota()).quota.available, 15);
  assert.equal((await h.client.voices())[0].name, "Kore");
  assert.equal((await h.client.getJob(id)).id, id);
  assert.ok(
    h.calls.every((call) => call.init.method === "GET" && call.init.headers.Authorization === "Bearer test-key"),
  );
});
test("malformed quota and voices fail", async () => {
  const h = harness([json({}), json({ voices: [{}] })]);
  await assert.rejects(h.client.quota());
  await assert.rejects(h.client.voices());
});
test("nonretryable errors omit raw server messages and credentials", async () => {
  const h = harness([
    json({ error: { code: "subscription_required", retryable: false, message: "test-key private script" } }, 503),
  ]);
  await assert.rejects(h.client.generate(input, requestId), (error) => {
    assert.match(error.message, /HTTP 503: subscription_required/);
    assert.ok(!error.message.includes("test-key") && !error.message.includes("private script"));
    return true;
  });
  assert.equal(h.calls.length, 1);
});
test("nonretryable unreadable HTTP errors do not resubmit", async () => {
  const h = harness([brokenResponse(401, { "Retry-After": "20" })]);
  await assert.rejects(h.client.generate(input, requestId), /HTTP 401/);
  assert.equal(h.calls.length, 1);
});
test("invalid JSON, redirects and oversized API bodies never retry", async () => {
  for (const response of [
    new Response("not JSON"),
    new Response("", { status: 302, headers: { Location: "https://other.test" } }),
    new Response("too big", { headers: { "Content-Length": "1048577" } }),
  ]) {
    const h = harness([response]);
    await assert.rejects(h.client.generate(input, requestId));
    assert.equal(h.calls.length, 1);
  }
});
test("download failures and redirects never create another job", async () => {
  for (const status of [302, 503]) {
    const h = harness([json(job()), new Response("", { status, headers: { Location: "https://other.test" } })]);
    await assert.rejects(h.client.generate(input, requestId), /retry this download, not generation/);
    assert.equal(h.calls.length, 2);
    assert.equal(h.calls[1].init.headers, undefined);
  }
});
test("download size limit is enforced both with and without content length", async () => {
  for (const response of [
    new Response(wav, { headers: { "Content-Length": String(wav.length) } }),
    new Response(wav),
  ]) {
    const h = harness([json(job()), response], { maxAudioBytes: 8 });
    await assert.rejects(h.client.generate(input, requestId), /size limit/);
  }
});
for (const url of [
  "http://example.com/a.wav",
  "https://user:password@example.com/a.wav",
  "file:///tmp/audio.wav",
  "https://audio.test/a#fragment",
  "https://audio.test/\nrecording",
]) {
  test("unsafe audio URL rejected before download: " + url, async () => {
    const h = harness([json(job("success", { result: { ...result, url } }))]);
    await assert.rejects(h.client.generate(input, requestId));
    assert.equal(h.calls.length, 1);
  });
}
test("invalid configuration fails locally", () => {
  for (const options of [
    { apiKey: "" },
    { apiKey: "bad key" },
    { apiKey: "key", timeoutMs: NaN },
    { apiKey: "key", baseUrl: "https://user:pass@example.com" },
  ]) {
    assert.throws(() => new FlowSpeechClient(options));
  }
  assert.equal(validateId(requestId.toUpperCase()), requestId);
});
test("deadline ends before a required poll with both recovery IDs", async () => {
  const h = harness([json(job("queued"), 202)], { timeoutMs: 4000 });
  await assert.rejects(
    h.client.generate(input, requestId),
    new RegExp("timeout.*requestId=" + requestId + ".*jobId=" + id),
  );
  assert.equal(h.calls.length, 1);
});
test("pre-aborted operations do not submit", async () => {
  const h = harness([]);
  await assert.rejects(h.client.generate(input, requestId, AbortSignal.abort()), /stopped/);
  assert.equal(h.calls.length, 0);
});
test("retry exhaustion is bounded", async () => {
  const h = harness(Array.from({ length: 5 }, () => new Error("network")));
  await assert.rejects(h.client.generate(input, requestId), /bounded retries/);
  assert.equal(h.calls.length, 5);
});
for (const useDeadline of [false, true])
  test(
    "audio stream " + (useDeadline ? "deadline" : "cancellation") + " stops reads and keeps IDs",
    { timeout: 2000 },
    async () => {
      const controller = new AbortController();
      let cancelled = false;
      const stream = new ReadableStream({
        cancel() {
          cancelled = true;
        },
      });
      const hold = setTimeout(() => {}, 1500);
      const h = harness([json(job()), new Response(stream)], {
        timeoutMs: useDeadline ? 30 : 1000,
        now: () => performance.now(),
      });
      const pending = h.client.generate(input, requestId, controller.signal);
      if (!useDeadline) {
        await delay(10);
        controller.abort();
      }
      try {
        await assert.rejects(
          pending,
          (error) => error.message.includes("requestId=" + requestId) && error.message.includes("jobId=" + id),
        );
        assert.ok(cancelled);
        assert.equal(h.calls.length, 2);
      } finally {
        clearTimeout(hold);
      }
    },
  );

test("real WAV and odd padded ancillary chunks are accepted", () => {
  validateWav(wav);
  validateWav(
    riff([
      chunk("JUNK", Buffer.from([1])),
      chunk("fmt ", format()),
      chunk("data", Buffer.alloc(2)),
      chunk("LIST", Buffer.from([1, 2, 3])),
    ]),
  );
  validateWav(riff([chunk("fmt ", Buffer.concat([format(), Buffer.alloc(2)])), chunk("data", Buffer.alloc(2))]));
});
const invalidWavs = [
  ["header only", Buffer.from("RIFF\x04\0\0\0WAVE")],
  ["truncated data", wav.subarray(0, -1)],
  ["trailing garbage", Buffer.concat([wav, Buffer.from([0])])],
  ["missing fmt", riff([chunk("data", Buffer.alloc(2))])],
  ["missing data", riff([chunk("fmt ", format())])],
  ["data before fmt", riff([chunk("data", Buffer.alloc(2)), chunk("fmt ", format())])],
  ["empty data", riff([chunk("fmt ", format()), chunk("data", Buffer.alloc(0))])],
  ["unaligned data", riff([chunk("fmt ", format()), chunk("data", Buffer.alloc(3))])],
  ["duplicate data", riff([chunk("fmt ", format()), chunk("data", Buffer.alloc(2)), chunk("data", Buffer.alloc(2))])],
  ["duplicate fmt", riff([chunk("fmt ", format()), chunk("fmt ", format()), chunk("data", Buffer.alloc(2))])],
  ["short fmt", riff([chunk("fmt ", format().subarray(0, 14)), chunk("data", Buffer.alloc(2))])],
  [
    "short extension",
    riff([chunk("fmt ", Buffer.concat([format(), Buffer.alloc(1)])), chunk("data", Buffer.alloc(2))]),
  ],
  ["incomplete chunk header", riff([chunk("fmt ", format()), Buffer.from("data")])],
];
for (const [offset, value, width, label] of [
  [0, 3, 2, "float encoding"],
  [2, 2, 2, "stereo"],
  [4, 48000, 4, "sample rate"],
  [8, 96000, 4, "byte rate"],
  [12, 4, 2, "alignment"],
  [14, 8, 2, "bit depth"],
]) {
  const fmt = format();
  if (width === 2) fmt.writeUInt16LE(value, offset);
  else fmt.writeUInt32LE(value, offset);
  invalidWavs.push([label, riff([chunk("fmt ", fmt), chunk("data", Buffer.alloc(4))])]);
}
const oversizedChunk = Buffer.from(wav);
oversizedChunk.writeUInt32LE(0xffffffff, 40);
invalidWavs.push(["oversized chunk", oversizedChunk]);
const highBitMagic = Buffer.from(wav);
highBitMagic[0] |= 0x80;
invalidWavs.push(["non-ASCII RIFF magic", highBitMagic]);
const missingPadding = riff([
  chunk("fmt ", format()),
  chunk("data", Buffer.alloc(2)),
  chunk("JUNK", Buffer.alloc(1)),
]).subarray(0, -1);
missingPadding.writeUInt32LE(missingPadding.length - 8, 4);
invalidWavs.push(["missing padding", missingPadding]);
for (const [name, bytes] of invalidWavs)
  test("rejects malformed WAV: " + name, async () => {
    assert.throws(() => validateWav(bytes), /PCM WAV/);
    const h = harness([json(job()), new Response(bytes)]);
    await assert.rejects(h.client.generate(input, requestId), /PCM WAV.*jobId=/);
    assert.equal(h.calls.length, 2);
  });
