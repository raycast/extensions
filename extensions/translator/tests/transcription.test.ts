import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  buildAudioTranscriptionsUrl,
  transcribeAudioFile,
  TRANSCRIPTION_MODEL,
  TRANSCRIPTION_PROMPT,
} from "../src/transcription.ts";

test("builds an audio transcriptions URL", () => {
  assert.equal(
    buildAudioTranscriptionsUrl("https://api.openai.com/v1/"),
    "https://api.openai.com/v1/audio/transcriptions",
  );
  assert.equal(
    buildAudioTranscriptionsUrl("http://localhost:8080/v1/audio/transcriptions"),
    "http://localhost:8080/v1/audio/transcriptions",
  );
  assert.throws(() => buildAudioTranscriptionsUrl("file:///tmp/audio"), /HTTP or HTTPS/);
  assert.throws(() => buildAudioTranscriptionsUrl("http://api.example.com/v1"), /HTTPS unless it points to localhost/);
});

test("requires an OpenAI API key before reading or uploading audio", async () => {
  await assert.rejects(
    () =>
      transcribeAudioFile("/tmp/missing-recording.wav", {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "translation-model",
      }),
    /Configure the OpenAI API key/,
  );
});

test("uploads WAV audio as multipart data using gpt-4o-transcribe", async () => {
  let receivedBody = "";
  let receivedContentType: string | undefined;
  let receivedAuthorization: string | undefined;

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      receivedBody = Buffer.concat(chunks).toString("utf8");
      receivedContentType = request.headers["content-type"];
      receivedAuthorization = request.headers.authorization;

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ text: "Bom dia, equipe." }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const directory = await mkdtemp(join(tmpdir(), "translator-audio-"));
  const audioPath = join(directory, "recording.wav");
  await writeFile(audioPath, Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(2_048)]));

  try {
    const transcript = await transcribeAudioFile(audioPath, {
      baseUrl: `http://127.0.0.1:${address.port}/v1`,
      apiKey: "voice-key",
      model: "translation-model",
    });

    assert.equal(transcript, "Bom dia, equipe.");
    assert.match(receivedContentType ?? "", /^multipart\/form-data; boundary=/);
    assert.equal(receivedAuthorization, "Bearer voice-key");
    assert.match(receivedBody, new RegExp(`name="model"\\r\\n\\r\\n${TRANSCRIPTION_MODEL}`));
    assert.match(receivedBody, /name="response_format"\r\n\r\njson/);
    assert.match(receivedBody, new RegExp(`name="prompt"\\r\\n\\r\\n${escapeRegExp(TRANSCRIPTION_PROMPT)}`));
    assert.match(receivedBody, /name="file"; filename="recording.wav"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
