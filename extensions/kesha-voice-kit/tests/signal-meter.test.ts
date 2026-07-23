import { describe, expect, it } from "vitest";
import {
  buildRecordingMarkdown,
  buildTranscribingMarkdown,
  formatDuration,
  formatInputFormat,
  recordingStatusLabel,
  recordingStatusTone,
  signalProgress,
  signalStatusLabel,
  signalStatusTone,
} from "../src/lib/recording-view";
import { parseMeterChunk, parseMeterLine } from "../src/lib/signal-meter";
import type { DictationState } from "../src/lib/dictation-types";

describe("signal parsing", () => {
  it("parses valid meter JSON into listening and signal states", () => {
    expect(parseMeterLine('{"rms":0,"peak":0,"percent":0}')).toMatchObject({
      state: "listening",
      status: "Listening...",
      percent: 0,
    });
    expect(
      parseMeterLine('{"rms":0.01,"peak":0.04,"percent":20}'),
    ).toMatchObject({
      state: "signal",
      status: "Signal detected",
      percent: 20,
    });
  });

  it("ignores invalid lines and clamps percent", () => {
    expect(parseMeterLine("nope")).toBeNull();
    expect(parseMeterLine('{"rms":0,"peak":0,"percent":999}')).toMatchObject({
      percent: 100,
    });
    expect(parseMeterLine('{"rms":0,"peak":0,"percent":-10}')).toMatchObject({
      percent: 0,
    });
  });

  it("handles partial chunks without losing complete signals", () => {
    const first = parseMeterChunk(
      "",
      '{"rms":0,"peak":0,"percent":0}\n{"rms":',
    );
    expect(first.signals).toHaveLength(1);
    expect(first.remainder).toBe('{"rms":');

    const second = parseMeterChunk(
      first.remainder,
      '0.02,"peak":0.1,"percent":32}\n',
    );
    expect(second.signals).toHaveLength(1);
    expect(second.signals[0]).toMatchObject({ percent: 32, state: "signal" });
    expect(second.remainder).toBe("");
  });
});

describe("recording markdown", () => {
  it("keeps recording markdown calm and moves operational detail to metadata helpers", () => {
    const state: Extract<DictationState, { status: "recording" }> = {
      status: "recording",
      maxSeconds: 300,
      elapsedSeconds: 7,
      silentForMs: 0,
      idle: false,
      mic: { name: "Studio Mic", sampleRate: 48000, channels: 1 },
      signal: {
        rms: 0.01,
        peak: 0.05,
        percent: 24,
        state: "signal",
        status: "Signal detected",
      },
    };

    expect(buildRecordingMarkdown(state)).toBe(
      "# Recording\n\nSpeak now. Kesha records locally from your default microphone.",
    );
    expect(formatInputFormat(state.mic)).toBe("48000 Hz, 1 channel");
    expect(formatDuration(state.elapsedSeconds)).toBe("0:07");
    expect(signalProgress(state.signal)).toBe(0.24);
    expect(signalStatusLabel(state.signal.state)).toBe("Signal");
    expect(signalStatusTone(state.signal.state)).toBe("green");
    expect(recordingStatusLabel(state)).toBe("Signal");
    expect(recordingStatusTone(state)).toBe("green");
  });

  it("renders elapsed durations as m:ss and never advertises a max", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
    expect(formatDuration(0)).toBe("0:00");
  });

  it("flips the recording status tag to amber Idle when idle", () => {
    const state: Extract<DictationState, { status: "recording" }> = {
      status: "recording",
      maxSeconds: 300,
      elapsedSeconds: 42,
      silentForMs: 32_000,
      idle: true,
      mic: { name: "Studio Mic" },
      signal: {
        rms: 0,
        peak: 0,
        percent: 0,
        state: "listening",
        status: "Listening...",
      },
    };

    expect(buildRecordingMarkdown(state)).toBe(
      "# Recording\n\nNo speech detected — recording will stop soon.",
    );
    expect(recordingStatusLabel(state)).toBe("Idle");
    expect(recordingStatusTone(state)).toBe("orange");
  });

  it("maps meter states to Apple-like metadata labels and tones", () => {
    expect(formatInputFormat({ name: "Default input device" })).toBeNull();
    expect(signalStatusLabel("unavailable")).toBe("Meter Unavailable");
    expect(signalStatusTone("unavailable")).toBe("orange");
    expect(signalStatusLabel("starting")).toBe("Starting");
    expect(signalStatusTone("starting")).toBe("blue");
    expect(signalStatusLabel("listening")).toBe("Listening");
    expect(signalStatusTone("listening")).toBe("secondary");
  });

  it("keeps transcribing markdown minimal and exposes elapsed via helpers", () => {
    const state: Extract<DictationState, { status: "transcribing" }> = {
      status: "transcribing",
      elapsedSeconds: 12,
      timeoutSeconds: 60,
    };

    expect(buildTranscribingMarkdown(state)).toBe(
      "# Transcribing\n\nProcessing locally with Kesha Voice Kit.",
    );
    expect(formatDuration(state.elapsedSeconds)).toBe("0:12");
  });
});
