import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { defaultModelPath } from "./paths";
import { runFile } from "./process";
import { RecordingState, TranscriptSegment } from "./types";
import { buildWhisperArguments } from "./whisper-arguments";

interface WhisperJsonSegment {
  text?: string;
  offsets?: { from?: number; to?: number };
  timestamps?: { from?: string; to?: string };
}

interface WhisperJson {
  transcription?: WhisperJsonSegment[];
}

export function resolveModelPath(
  preferences: Preferences.ToggleRecording,
): string {
  const custom = preferences.whisperModelPath?.trim();
  return custom || defaultModelPath();
}

export function resolveWhisperCliPath(
  preferences: Preferences.ToggleRecording,
): string | undefined {
  const custom = preferences.whisperCliPath?.trim();
  const candidates = [
    custom,
    "/opt/homebrew/bin/whisper-cli",
    "/usr/local/bin/whisper-cli",
  ];
  return candidates.find((candidate): candidate is string =>
    Boolean(candidate && existsSync(candidate)),
  );
}

function timestampToMs(value?: string): number {
  if (!value) return 0;
  const parts = value.replace(",", ".").split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3)
    return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return parts[0] * 1000;
}

export async function transcribe(
  state: RecordingState,
  preferences: Preferences.ToggleRecording,
): Promise<{ segments: TranscriptSegment[]; transcriptPath: string }> {
  const modelPath = resolveModelPath(preferences);
  const whisperCliPath = resolveWhisperCliPath(preferences);
  if (!existsSync(modelPath)) {
    throw new Error(
      "No local Whisper model found. Run “Download Local Whisper Model” before recording.",
    );
  }
  if (!whisperCliPath)
    throw new Error(
      "whisper-cli not found. Install it with `brew install whisper-cpp` or set its path in preferences.",
    );
  const audioPath = join(state.sessionDir, "audio.wav");
  await runFile("/usr/bin/afconvert", [
    "-f",
    "WAVE",
    "-d",
    "LEI16@16000",
    "-c",
    "1",
    state.videoPath,
    audioPath,
  ]);

  const outputBase = join(state.sessionDir, "transcript");
  await runFile(
    whisperCliPath,
    buildWhisperArguments({
      modelPath,
      audioPath,
      language: preferences.language.trim() || "auto",
      outputBase,
    }),
  );

  const transcriptPath = `${outputBase}.json`;
  const parsed = JSON.parse(
    readFileSync(transcriptPath, "utf8"),
  ) as WhisperJson;
  const segments = (parsed.transcription ?? [])
    .map((segment) => ({
      fromMs: segment.offsets?.from ?? timestampToMs(segment.timestamps?.from),
      toMs: segment.offsets?.to ?? timestampToMs(segment.timestamps?.to),
      text: (segment.text ?? "").trim(),
    }))
    .filter((segment) => segment.text.length > 0);

  return { segments, transcriptPath };
}
