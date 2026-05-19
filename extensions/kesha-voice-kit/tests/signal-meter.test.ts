import { describe, expect, it } from "vitest";
import {
  buildRecordingMarkdown,
  renderSignalMeter,
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
  it("renders microphone, format, signal, and elapsed time", () => {
    const state: Extract<DictationState, { status: "recording" }> = {
      status: "recording",
      maxSeconds: 120,
      elapsedSeconds: 7,
      mic: { name: "Studio Mic", sampleRate: 48000, channels: 1 },
      signal: {
        rms: 0.01,
        peak: 0.05,
        percent: 24,
        state: "signal",
        status: "Signal detected",
      },
    };

    expect(buildRecordingMarkdown(state)).toContain(
      "**Microphone:** Studio Mic",
    );
    expect(buildRecordingMarkdown(state)).toContain(
      "**Format:** 48000 Hz, 1 channel",
    );
    expect(buildRecordingMarkdown(state)).toContain(
      "**Signal:** [##--------] 24%",
    );
    expect(buildRecordingMarkdown(state)).toContain("**Elapsed:** 7s / 120s");
  });

  it("renders unavailable meter state honestly", () => {
    expect(renderSignalMeter(0)).toBe("[----------]");
    expect(
      buildRecordingMarkdown({
        status: "recording",
        maxSeconds: 10,
        elapsedSeconds: 1,
        mic: { name: "Default input device" },
        signal: {
          rms: 0,
          peak: 0,
          percent: 0,
          state: "unavailable",
          status: "Meter unavailable",
        },
      }),
    ).toContain("**Status:** Meter unavailable");
  });
});
