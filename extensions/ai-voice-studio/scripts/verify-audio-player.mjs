import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTsLoader } from "./lib/ts-loader.mjs";
import { assert, expectRejects } from "./lib/verify-helpers.mjs";

const loadTs = createTsLoader();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-voice-studio-audio-test-"));
const fakeAfplay = path.join(tempDir, "afplay");
const fakeLog = path.join(tempDir, "afplay.log");
const pidFile = path.join(os.tmpdir(), "ai-voice-studio.pid");
const stopFile = path.join(os.tmpdir(), "ai-voice-studio.stop");

process.env.PATH = `${tempDir}${path.delimiter}${process.env.PATH || ""}`;
process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_LOG = fakeLog;

fs.writeFileSync(
  fakeAfplay,
  [
    "#!/bin/sh",
    'for arg in "$@"; do printf \'%s\\n\' "$arg" >> "$AI_VOICE_STUDIO_FAKE_AFPLAY_LOG"; done',
    "printf '__END__\\n' >> \"$AI_VOICE_STUDIO_FAKE_AFPLAY_LOG\"",
    'if [ -n "$AI_VOICE_STUDIO_FAKE_AFPLAY_SLEEP" ]; then sleep "$AI_VOICE_STUDIO_FAKE_AFPLAY_SLEEP"; fi',
    'if [ -n "$AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT" ]; then exit "$AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT"; fi',
    "exit 0",
    "",
  ].join("\n"),
);
fs.chmodSync(fakeAfplay, 0o755);

const { AudioPlayer, clearExternalStopRequest, hasExternalStopRequest } = loadTs("src/utils/audio-player.ts");

try {
  await verifyPlaybackArgsAndCleanup();
  await verifyPlainPlaybackArgs();
  await verifyEmptyAudioRejected();
  await verifyStaleStopMarkerDoesNotMaskFailure();
  await verifyFreshStopMarkerMasksFailure();
  await verifyIdleCleanupDoesNotRemoveForeignPid();

  console.log(
    JSON.stringify(
      {
        checked: [
          "afplay rate arguments",
          "temporary audio cleanup",
          "PID cleanup",
          "empty audio rejection",
          "stale stop marker rejection path",
          "fresh stop marker graceful stop path",
          "idle player cleanup preserves foreign PID files",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.rmSync(pidFile, { force: true });
  fs.rmSync(stopFile, { force: true });
}

async function verifyPlaybackArgsAndCleanup() {
  fs.rmSync(fakeLog, { force: true });
  fs.rmSync(pidFile, { force: true });
  fs.rmSync(stopFile, { force: true });
  delete process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT;

  const player = new AudioPlayer();
  await player.playAudio(Buffer.from("audio").toString("base64"), "wav", 1.25);

  const invocation = readLastInvocation();
  assert(invocation[0] === "-r", "Playback rate should use afplay -r");
  assert(invocation[1] === "1.25", "Playback rate should be passed with two decimals trimmed by afplay shell log");
  assert(invocation[2] === "-q", "Playback rate should set afplay rate quality flag");
  assert(invocation[3] === "1", "Playback rate quality should be high");
  const audioPath = invocation[4];
  assert(audioPath.endsWith(".wav"), "Audio temp file should preserve sanitized format extension");
  assert(!fs.existsSync(audioPath), "Audio temp file should be deleted after playback");
  assert(!fs.existsSync(pidFile), "PID file should be deleted after playback");
}

async function verifyPlainPlaybackArgs() {
  fs.rmSync(fakeLog, { force: true });
  const player = new AudioPlayer();
  await player.playAudio(Buffer.from("audio").toString("base64"), "mp3", 1);

  const invocation = readLastInvocation();
  assert(invocation.length === 1, "Normal speed should call afplay with only the file path");
  assert(invocation[0].endsWith(".mp3"), "Normal speed temp file should use mp3 extension");
  assert(!fs.existsSync(invocation[0]), "Normal speed temp file should be deleted after playback");
}

async function verifyEmptyAudioRejected() {
  const player = new AudioPlayer();
  await expectRejects(
    () => player.playAudio("", "mp3", 1),
    (error) => error instanceof Error && error.message === "Decoded audio data is empty",
    "Empty audio should be rejected before spawning afplay",
  );
}

async function verifyStaleStopMarkerDoesNotMaskFailure() {
  fs.rmSync(fakeLog, { force: true });
  fs.writeFileSync(stopFile, String(Date.now() - 60_000), "utf8");
  process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT = "7";

  const player = new AudioPlayer();
  await expectRejects(
    () => player.playAudio(Buffer.from("audio").toString("base64"), "mp3", 1),
    (error) => error instanceof Error && error.message.includes("afplay exited with code 7"),
    "Stale stop marker should not mask afplay failures",
  );
  assert(hasExternalStopRequest(), "Stale stop marker should remain until explicitly cleared");
  clearExternalStopRequest();
  assert(!hasExternalStopRequest(), "Stop marker should clear explicitly");
  delete process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT;
}

async function verifyFreshStopMarkerMasksFailure() {
  fs.rmSync(fakeLog, { force: true });
  fs.rmSync(stopFile, { force: true });
  process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT = "7";
  process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_SLEEP = "0.2";

  const player = new AudioPlayer();
  const playPromise = player.playAudio(Buffer.from("audio").toString("base64"), "mp3", 1);
  await waitUntil(() => fs.existsSync(fakeLog), 1000);
  fs.writeFileSync(stopFile, String(Date.now()), "utf8");
  await playPromise;
  clearExternalStopRequest();

  delete process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_EXIT;
  delete process.env.AI_VOICE_STUDIO_FAKE_AFPLAY_SLEEP;
}

async function verifyIdleCleanupDoesNotRemoveForeignPid() {
  fs.rmSync(stopFile, { force: true });
  fs.writeFileSync(pidFile, "424242", "utf8");

  const player = new AudioPlayer();
  player.cleanup();

  assert(fs.existsSync(pidFile), "Idle player cleanup should not remove another player's PID file");
  assert(fs.readFileSync(pidFile, "utf8") === "424242", "Foreign PID file should remain unchanged");
  fs.rmSync(pidFile, { force: true });
}

function readLastInvocation() {
  const content = fs.readFileSync(fakeLog, "utf8").trim();
  const groups = content
    .split("__END__")
    .map((group) => group.trim())
    .filter(Boolean);
  return groups.at(-1).split("\n").filter(Boolean);
}

async function waitUntil(predicate, timeoutMs) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for test condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
