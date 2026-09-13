import assert from "node:assert/strict";
import test from "node:test";
import { buildWhisperArguments } from "../src/lib/whisper-arguments.ts";

test("transcribes the complete recording without a voice-activity gate", () => {
  const arguments_ = buildWhisperArguments({
    modelPath: "/models/whisper.bin",
    audioPath: "/sessions/audio.wav",
    language: "auto",
    outputBase: "/sessions/transcript",
  });

  assert.deepEqual(arguments_, [
    "-m",
    "/models/whisper.bin",
    "-f",
    "/sessions/audio.wav",
    "-l",
    "auto",
    "-sns",
    "-ojf",
    "-of",
    "/sessions/transcript",
    "-np",
  ]);
  assert.equal(arguments_.includes("--vad"), false);
});
