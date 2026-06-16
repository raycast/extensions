import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildSoxArguments,
  formatRecordingDuration,
  stopAudioRecording,
  type AudioRecordingSession,
} from "../src/audio.ts";

test("builds a mono 16 kHz WAV recording command", () => {
  assert.deepEqual(buildSoxArguments("/tmp/voice.wav"), [
    "-q",
    "-d",
    "-t",
    "wav",
    "-r",
    "16000",
    "-c",
    "1",
    "-b",
    "16",
    "/tmp/voice.wav",
  ]);
});

test("formats the live recording duration", () => {
  assert.equal(formatRecordingDuration(0), "00:00");
  assert.equal(formatRecordingDuration(65), "01:05");
});

test("stops the recorder and keeps a valid audio file for transcription", async () => {
  const directory = await mkdtemp(join(tmpdir(), "translator-recording-"));
  const filePath = join(directory, "recording.wav");
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1_000)"]);
  await once(child, "spawn");
  await writeFile(filePath, Buffer.alloc(16 * 1024));

  try {
    const result = await stopAudioRecording(recordingSession(child, filePath));
    assert.equal(result, filePath);
    assert.equal((await stat(filePath)).size, 16 * 1024);
  } finally {
    child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});

test("removes an unusable recording after validation fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "translator-recording-"));
  const filePath = join(directory, "recording.wav");
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1_000)"]);
  await once(child, "spawn");
  await writeFile(filePath, Buffer.alloc(128));

  try {
    await assert.rejects(() => stopAudioRecording(recordingSession(child, filePath)), /too short/);
    await assert.rejects(() => stat(filePath), { code: "ENOENT" });
  } finally {
    child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});

function recordingSession(process: AudioRecordingSession["process"], filePath: string): AudioRecordingSession {
  return {
    process,
    filePath,
    soxPath: "/usr/bin/true",
    startedAt: Date.now(),
    stopRequested: false,
    stderr: "",
  };
}
