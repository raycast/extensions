export { FlowSpeechClient, dialogueInput, validateId, validateWav } from "../.test-dist/client.js";
import { FlowSpeechClient } from "../.test-dist/client.js";
export const id = "b698824b-de05-486d-8833-05d5c4522a39";
export const requestId = "51382b81-9d36-49a5-994e-9b67686c6bd1";
export const input = { mode: "single", text: "Hello", voiceName: "Kore" };
export const audioUrl = "https://audio.example.test/result.wav";
export const result = {
  url: audioUrl,
  mimeType: "audio/wav",
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
  access: "link",
};

export function chunk(name, content) {
  const bytes = Buffer.alloc(8 + content.length + (content.length % 2));
  bytes.write(name, 0, 4, "ascii");
  bytes.writeUInt32LE(content.length, 4);
  content.copy(bytes, 8);
  return bytes;
}
export function riff(chunks) {
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WAVE", 8);
  return Buffer.concat([header, body]);
}
export function format() {
  const bytes = Buffer.alloc(16);
  bytes.writeUInt16LE(1, 0);
  bytes.writeUInt16LE(1, 2);
  bytes.writeUInt32LE(24000, 4);
  bytes.writeUInt32LE(48000, 8);
  bytes.writeUInt16LE(2, 12);
  bytes.writeUInt16LE(16, 14);
  return bytes;
}
export const wav = riff([chunk("fmt ", format()), chunk("data", Buffer.alloc(48))]);
export function job(status = "success", extra = {}) {
  return {
    id,
    requestId,
    status,
    progress: { completed: status === "success" ? 1 : 0, total: 1 },
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:01.000Z",
    deadlineAt: "2026-10-26T02:00:00.000Z",
    usage: {
      billableCharacters: 5,
      reservedCredits: status === "queued" ? 5 : 0,
      chargedCredits: status === "success" ? 5 : 0,
    },
    ...(status === "success" ? { result: { ...result }, resultDeleted: false } : {}),
    ...extra,
  };
}
export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
export function brokenResponse(status = 200, headers = {}) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new Error("interrupted body"));
      },
    }),
    { status, headers },
  );
}
export function harness(steps, options = {}) {
  const calls = [],
    sleeps = [];
  let now = 0;
  const client = new FlowSpeechClient({
    apiKey: "test-key",
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
    fetch: async (url, init) => {
      calls.push({ url: String(url), init, at: now });
      const next = steps.shift();
      if (next instanceof Error) throw next;
      if (!next) throw new Error("Unexpected fake request");
      return typeof next === "function" ? next(url, init) : next;
    },
    ...options,
  });
  return { client, calls, sleeps };
}
