const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { load } = require("./helpers.cjs");

test("HTTP response fragments are combined and truncated responses rejected", async () => {
  let truncate = false;
  const body = JSON.stringify({ text: "first middle last", sampleCount: 100, confidence: 1, provider: "test" });
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Length": Buffer.byteLength(body) });
    response.write(body.slice(0, 10));
    setTimeout(() => (truncate ? response.destroy() : response.end(body.slice(10))), 10);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { FluidVoiceAPI } = load("api/fluidVoice.ts", {
      "@raycast/api": { getPreferenceValues: () => ({ fluidVoicePort: String(server.address().port) }) },
    });
    assert.equal((await FluidVoiceAPI.transcribeFile("test.wav")).text, "first middle last");
    truncate = true;
    await assert.rejects(FluidVoiceAPI.transcribeFile("test.wav"), /full response|Incomplete/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function apiServer(t, handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return load("api/fluidVoice.ts", {
    "@raycast/api": { getPreferenceValues: () => ({ fluidVoicePort: String(server.address().port) }) },
  }).FluidVoiceAPI;
}

test("file transcription sends one JSON path request and retains response metadata", async (t) => {
  const requests = [];
  const api = await apiServer(t, (request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      requests.push({
        method: request.method,
        path: request.url,
        body: JSON.parse(body),
        contentType: request.headers["content-type"],
      });
      response.end(
        JSON.stringify({ text: "full transcript", confidence: 0.7, sampleCount: 64000000, provider: "speech model" }),
      );
    });
  });
  const file = '/tmp/audio "quoted".mp3';
  const result = await api.transcribeFile(file);
  assert.deepEqual(requests, [
    { method: "POST", path: "/v1/transcribe", body: { path: file }, contentType: "application/json" },
  ]);
  assert.equal(result.provider, "speech model");
  assert.equal(result.sampleCount, 64000000);
  assert.equal(result.text, "full transcript");
});

test("malformed or empty successful transcription responses cannot report success", async (t) => {
  let payload;
  const api = await apiServer(t, (request, response) => response.end(JSON.stringify(payload)));
  for (const value of [
    {},
    { text: "ok" },
    { text: "ok", confidence: 1, sampleCount: -1, provider: "test" },
    { text: "", confidence: 1, sampleCount: 0, provider: "test" },
  ]) {
    payload = value;
    await assert.rejects(api.transcribeFile("test.wav"), /Invalid transcription|no speech/);
  }
});

test("API errors preserve JSON and plain-text error messages", async (t) => {
  let body = JSON.stringify({ error: "FluidVoice is busy" });
  const api = await apiServer(t, (request, response) => {
    response.writeHead(400);
    response.end(body);
  });
  await assert.rejects(api.transcribeFile("test.wav"), /FluidVoice is busy/);
  body = "Unsupported media";
  await assert.rejects(api.transcribeFile("test.wav"), /Unsupported media/);
});

test("health and history reject unexpected service responses", async (t) => {
  let payload = {};
  const api = await apiServer(t, (request, response) => response.end(JSON.stringify(payload)));
  await assert.rejects(api.health(), /Invalid health/);
  await assert.rejects(api.history(), /Invalid history/);
  payload = { items: [{ id: "1", finalText: "test" }] };
  await assert.rejects(api.history(), /Invalid history/);
  payload = { status: "ok", version: "1.6.11" };
  assert.equal((await api.health()).version, "1.6.11");
  payload = { items: [] };
  assert.deepEqual((await api.history()).items, []);
});

test("invalid port preferences are rejected before opening a connection", async () => {
  for (const port of ["0", "65536", "not-a-port", "1.5"]) {
    const api = load("api/fluidVoice.ts", {
      "@raycast/api": { getPreferenceValues: () => ({ fluidVoicePort: port }) },
    }).FluidVoiceAPI;
    await assert.rejects(api.health(), /Invalid FluidVoice API port/);
  }
});

test("inference can be cancelled explicitly without imposing a long-audio deadline", async (t) => {
  const api = await apiServer(t, () => {});
  const controller = new AbortController();
  const result = api.transcribeFile("test.wav", controller.signal);
  controller.abort();
  await assert.rejects(result, /abort/i);
});
