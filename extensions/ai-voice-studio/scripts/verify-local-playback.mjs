import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTsLoader } from "./lib/ts-loader.mjs";
import { assert } from "./lib/verify-helpers.mjs";
import { writeVerificationEvidence } from "./lib/verification-evidence.mjs";

const root = process.cwd();
const loadTs = createTsLoader();
const pidFile = path.join(os.tmpdir(), "ai-voice-studio.pid");
const stopFile = path.join(os.tmpdir(), "ai-voice-studio.stop");
const maxPlaybackMs = 3000;

const { AudioPlayer, clearExternalStopRequest } = loadTs("src/utils/audio-player.ts");

fs.rmSync(pidFile, { force: true });
fs.rmSync(stopFile, { force: true });
const beforeFiles = listAudioTempFiles();

const player = new AudioPlayer();
const startedAt = Date.now();

try {
  await player.playAudio(makeSilentWavBase64(120), "wav", 1);
  const elapsedMs = Date.now() - startedAt;
  assert(elapsedMs <= maxPlaybackMs, `Silent local playback took ${elapsedMs}ms, expected <= ${maxPlaybackMs}ms`);
  assert(!fs.existsSync(pidFile), "PID file should be cleaned after real afplay playback");

  const afterFiles = listAudioTempFiles();
  const leaked = afterFiles.filter((file) => !beforeFiles.includes(file));
  assert(leaked.length === 0, `Temporary audio files leaked: ${leaked.join(", ")}`);

  console.log(
    JSON.stringify(
      {
        checked: ["real afplay silent WAV playback", "real playback PID cleanup", "real playback temp-file cleanup"],
        elapsedMs,
      },
      null,
      2,
    ),
  );
  writeVerificationEvidence(root, "local-playback", {
    command: "npm run verify:local-playback",
    elapsedMs,
    checked: ["real afplay silent WAV playback", "real playback PID cleanup", "real playback temp-file cleanup"],
  });
} finally {
  player.cleanup();
  clearExternalStopRequest();
  fs.rmSync(pidFile, { force: true });
  fs.rmSync(stopFile, { force: true });
}

function makeSilentWavBase64(durationMs) {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
  const dataSize = sampleCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer.toString("base64");
}

function listAudioTempFiles() {
  return fs
    .readdirSync(os.tmpdir())
    .filter((name) => /^ai-voice-studio-.*\.(mp3|wav)$/i.test(name))
    .sort();
}
