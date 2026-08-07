import { describe, expect, it, vi } from "vitest";
import {
  buildRecordingMarkdown,
  buildResultMarkdown,
  buildTranscribingMarkdown,
  formatDuration,
  formatInputFormat,
  recordingStatusLabel,
  recordingStatusTone,
  signalProgress,
  signalStatusLabel,
  signalStatusTone,
} from "../src/lib/recording-view";
import {
  loudestChannelRms,
  parseMeterChunk,
  parseMeterLine,
  percentFromPeak,
  startLiveMicMeter,
} from "../src/lib/signal-meter";
import type { DictationState, SignalLevel } from "../src/lib/dictation-types";
import type { spawn } from "node:child_process";
import { FakeProcess } from "./helpers/fake-process";

describe("signal parsing", () => {
  // Thresholds are the rms percentiles measured on a built-in mic (#648).
  it("separates a quiet room from speech", () => {
    expect(parseMeterLine('{"channelRms":[0.0075],"peak":0.02}')?.state).toBe("listening");
    expect(parseMeterLine('{"channelRms":[0.0021],"peak":0.0085}')?.state).toBe("listening");
    expect(parseMeterLine('{"channelRms":[0.0352],"peak":0.09}')?.state).toBe("signal");
    expect(parseMeterLine('{"channelRms":[0.012],"peak":0.03}')?.state).toBe("signal");
  });

  it("keeps a noisy room audible rather than cutting the speaker off", () => {
    // Auto-stop then never fires there — today's behaviour, and the safe way to be wrong.
    expect(parseMeterLine('{"channelRms":[0.027],"peak":0.078}')?.state).toBe("signal");
  });

  it("hears speech carried by one channel of a multi-input device", () => {
    // Pooled across both channels this speech would read as 0.012/sqrt(2) = 0.0085,
    // under the threshold, and the idle timer would stop an active recording.
    expect(parseMeterLine('{"channelRms":[0.012,0],"peak":0.03}')?.rms).toBeCloseTo(0.012, 6);
    expect(parseMeterLine('{"channelRms":[0.012,0],"peak":0.03}')?.state).toBe("signal");
    expect(parseMeterLine('{"channelRms":[0,0,0.012,0],"peak":0.03}')?.state).toBe("signal");
  });

  it("reads no level when the meter reports no usable channels", () => {
    expect(loudestChannelRms(undefined)).toBe(0);
    expect(loudestChannelRms([])).toBe(0);
    expect(loudestChannelRms(["0.5", null, 0.02])).toBe(0.02);
    expect(parseMeterLine('{"peak":0.03}')?.state).toBe("listening");
  });

  it("ignores invalid lines", () => {
    expect(parseMeterLine("nope")).toBeNull();
    expect(parseMeterLine("")).toBeNull();
  });

  it("maps peak to percent on a dB scale, not sqrt", () => {
    // #648's formula yields 17% for a quiet room, not the 0% it predicted.
    expect(percentFromPeak(0)).toBe(0);
    expect(percentFromPeak(0.0085)).toBe(17);
    expect(percentFromPeak(0.0368)).toBe(43);
    expect(percentFromPeak(1)).toBe(100);
  });

  it("handles partial chunks without losing complete signals", () => {
    const first = parseMeterChunk("", '{"channelRms":[0],"peak":0}\n{"channelRms":');
    expect(first.signals).toHaveLength(1);
    expect(first.remainder).toBe('{"channelRms":');

    const second = parseMeterChunk(first.remainder, '[0.02],"peak":0.1}\n');
    expect(second.signals).toHaveLength(1);
    expect(second.signals[0]).toMatchObject({ rms: 0.02, state: "signal" });
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
      signal: { rms: 0.01, peak: 0.05, percent: 24, state: "signal" },
    };

    expect(buildRecordingMarkdown(state)).toBe(
      "# Recording\n\nSpeak now. Kesha records locally from your default microphone.",
    );
    expect(formatInputFormat(state.mic)).toBe("48000 Hz, 1 channel");
    expect(signalProgress(state.signal)).toBe(0.24);
    expect(recordingStatusLabel(state)).toBe("Signal");
    expect(recordingStatusTone(state)).toBe("green");
  });

  it("renders the transcript under a Dictation heading", () => {
    expect(buildResultMarkdown("hello world")).toBe(
      "# Dictation\n\nhello world",
    );
    expect(buildTranscribingMarkdown()).toBe(
      "# Transcribing\n\nProcessing locally with Kesha Voice Kit.",
    );
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
      signal: { rms: 0, peak: 0, percent: 0, state: "listening" },
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
    expect(signalStatusLabel("signal")).toBe("Signal");
    expect(signalStatusTone("signal")).toBe("green");
  });
});

describe("startLiveMicMeter", () => {
  function startWithFakeProcess() {
    const proc = new FakeProcess();
    const signals: SignalLevel[] = [];
    const stop = startLiveMicMeter((signal) => signals.push(signal), {
      spawn: vi.fn(() => proc) as unknown as typeof spawn,
      kill: vi.fn(),
      setTimeout: vi.fn(() => ({
        unref: vi.fn(),
      })) as unknown as typeof setTimeout,
    });
    return { proc, signals, stop };
  }

  it("reports unavailable when the meter dies after delivering samples", () => {
    const { proc, signals } = startWithFakeProcess();

    proc.emitStdout('{"channelRms":[0.05],"peak":0.1}\n');
    proc.emit("exit", 1, null);

    expect(signals.at(-2)?.state).toBe("signal");
    expect(signals.at(-1)?.state).toBe("unavailable");
  });

  it("stays quiet when the session stops the meter itself", () => {
    const { proc, signals, stop } = startWithFakeProcess();

    proc.emitStdout('{"channelRms":[0.05],"peak":0.1}\n');
    stop();
    proc.emit("exit", 0, "SIGTERM");

    expect(signals.map((s) => s.state)).not.toContain("unavailable");
    expect(signals.at(-1)?.state).toBe("signal");
  });
});
