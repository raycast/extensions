import type { DictationState, SignalLevel } from "./dictation-types";

export function emptySignal(
  status: string,
  state: SignalLevel["state"],
): SignalLevel {
  return { rms: 0, peak: 0, percent: 0, status, state };
}

export function renderSignalMeter(percent: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return `[${"#".repeat(filled)}${"-".repeat(10 - filled)}]`;
}

export function buildRecordingMarkdown(
  state: Extract<DictationState, { status: "recording" }>,
): string {
  const micDetails = [
    state.mic.sampleRate ? `${state.mic.sampleRate} Hz` : null,
    state.mic.channels
      ? `${state.mic.channels} channel${state.mic.channels === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  const meter = renderSignalMeter(state.signal.percent);
  return [
    "# Recording",
    "",
    `**Microphone:** ${state.mic.name}`,
    micDetails.length ? `**Format:** ${micDetails.join(", ")}` : null,
    `**Signal:** ${meter} ${state.signal.percent}%`,
    `**Status:** ${state.signal.status}`,
    `**Elapsed:** ${state.elapsedSeconds}s / ${state.maxSeconds}s`,
    "",
    "Speak now. Recording stops automatically at the max duration.",
  ]
    .filter((line): line is string => line != null)
    .join("\n\n");
}

export function buildResultMarkdown(text: string): string {
  return ["# Dictation", "", text].join("\n");
}
