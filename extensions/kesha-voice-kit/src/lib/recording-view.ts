import type {
  DictationState,
  SignalLevel,
  SignalState,
} from "./dictation-types";

export function emptySignal(
  status: string,
  state: SignalLevel["state"],
): SignalLevel {
  return { rms: 0, peak: 0, percent: 0, status, state };
}

export function buildRecordingMarkdown(
  state: Extract<DictationState, { status: "recording" }>,
): string {
  void state;
  return [
    "# Recording",
    "Speak now. Kesha records locally from your default microphone.",
  ].join("\n\n");
}

export function buildResultMarkdown(text: string): string {
  return ["# Dictation", "", text].join("\n");
}

export function buildTranscribingMarkdown(
  state: Extract<DictationState, { status: "transcribing" }>,
): string {
  void state;
  return ["# Transcribing", "Processing locally with Kesha Voice Kit."].join(
    "\n\n",
  );
}

export function formatInputFormat(
  mic: Extract<DictationState, { status: "recording" }>["mic"],
): string | null {
  const details = [
    mic.sampleRate ? `${mic.sampleRate} Hz` : null,
    mic.channels
      ? `${mic.channels} channel${mic.channels === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  return details.length ? details.join(", ") : null;
}

export function formatElapsed(
  elapsedSeconds: number,
  maxSeconds: number,
): string {
  return `${elapsedSeconds}s / ${maxSeconds}s`;
}

export function signalProgress(signal: SignalLevel): number {
  return Math.max(0, Math.min(1, signal.percent / 100));
}

export function signalStatusLabel(state: SignalState): string {
  switch (state) {
    case "signal":
      return "Signal";
    case "listening":
      return "Listening";
    case "unavailable":
      return "Meter Unavailable";
    case "starting":
      return "Starting";
  }
}

export function signalStatusTone(
  state: SignalState,
): "green" | "blue" | "orange" | "secondary" {
  switch (state) {
    case "signal":
      return "green";
    case "starting":
      return "blue";
    case "unavailable":
      return "orange";
    case "listening":
      return "secondary";
  }
}
