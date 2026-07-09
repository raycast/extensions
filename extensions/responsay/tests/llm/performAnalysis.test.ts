import { describe, it, expect, vi } from "vitest";
import { performAnalysis } from "../../src/llm/performAnalysis";
import type { AnalysisIo, AnalysisSinks } from "../../src/llm/performAnalysis";
import type { ProsodyAnalysis } from "../../src/types";

function fakeAnalysis(text: string): ProsodyAnalysis {
  return {
    text,
    isGeneratedExample: false,
    ipa: "/test/",
    thoughtGroups: [
      {
        tone: "fall",
        words: [
          {
            text,
            syllables: [text],
            stressIndex: 0,
            stressed: true,
            nuclear: true,
          },
        ],
      },
    ],
  };
}

function makeSinks(): AnalysisSinks {
  return {
    setLoading: vi.fn(),
    setFailed: vi.fn(),
    setAnalysis: vi.fn(),
  };
}

function makeIo(overrides: Partial<AnalysisIo> = {}): AnalysisIo {
  return {
    analyze: vi.fn(async (text: string) => fakeAnalysis(text)),
    readCache: vi.fn(() => null), // force the network path
    writeCache: vi.fn(),
    reportError: vi.fn(async () => {}),
    ...overrides,
  };
}

const prefs = { openaiApiKey: "sk-test" };

describe("performAnalysis", () => {
  it("applies a fresh analysis result when still current", async () => {
    const io = makeIo();
    const sinks = makeSinks();

    await performAnalysis("hello", "openai", {
      prefs,
      isCurrent: () => true,
      sinks,
      io,
    });

    expect(sinks.setAnalysis).toHaveBeenCalledTimes(1);
    expect(sinks.setAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hello" }),
    );
    expect(io.writeCache).toHaveBeenCalledTimes(1);
    expect(sinks.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("returns a cached result without hitting the network", async () => {
    const cached = fakeAnalysis("cached");
    const io = makeIo({ readCache: vi.fn(() => cached) });
    const sinks = makeSinks();

    await performAnalysis("cached", "openai", {
      prefs,
      isCurrent: () => true,
      sinks,
      io,
    });

    expect(io.analyze).not.toHaveBeenCalled();
    expect(sinks.setAnalysis).toHaveBeenCalledWith(cached);
  });

  it("can return a cached result before requiring an API key", async () => {
    const cached = fakeAnalysis("cached-without-key");
    const io = makeIo({ readCache: vi.fn(() => cached) });
    const sinks = makeSinks();

    await performAnalysis("cached-without-key", "openai", {
      prefs: {},
      isCurrent: () => true,
      sinks,
      io,
    });

    expect(io.analyze).not.toHaveBeenCalled();
    expect(io.reportError).not.toHaveBeenCalled();
    expect(sinks.setAnalysis).toHaveBeenCalledWith(cached);
  });

  it("discards a stale analysis result once it is no longer current", async () => {
    const sinks = makeSinks();
    let resolveAnalyze!: (a: ProsodyAnalysis) => void;
    const io = makeIo({
      analyze: vi.fn(
        () =>
          new Promise<ProsodyAnalysis>((resolve) => {
            resolveAnalyze = resolve;
          }),
      ),
    });

    let current = true;
    const pending = performAnalysis("stale-input", "openai", {
      prefs,
      isCurrent: () => current,
      sinks,
      io,
    });

    // A newer request supersedes this one while analyze() is still in flight.
    current = false;
    resolveAnalyze(fakeAnalysis("stale-input"));
    await pending;

    // The stale result must NOT overwrite the fresher state.
    expect(sinks.setAnalysis).not.toHaveBeenCalled();
    // Nor should a superseded request flip the shared loading flag back off.
    expect(sinks.setLoading).not.toHaveBeenCalledWith(false);
  });

  it("does not mark a stale request as failed, but still reports the error", async () => {
    const sinks = makeSinks();
    let rejectAnalyze!: (e: unknown) => void;
    const io = makeIo({
      analyze: vi.fn(
        () =>
          new Promise<ProsodyAnalysis>((_, reject) => {
            rejectAnalyze = reject;
          }),
      ),
    });

    let current = true;
    const pending = performAnalysis("x", "openai", {
      prefs,
      isCurrent: () => current,
      sinks,
      io,
    });

    current = false;
    rejectAnalyze(new Error("boom"));
    await pending;

    // A superseded failure must not flip the current request's failed flag on.
    expect(sinks.setFailed).not.toHaveBeenCalledWith(true);
    // Errors are never silently swallowed.
    expect(io.reportError).toHaveBeenCalledTimes(1);
  });

  it("marks a current request as failed on error", async () => {
    const sinks = makeSinks();
    const io = makeIo({
      analyze: vi.fn(async () => {
        throw new Error("boom");
      }),
    });

    await performAnalysis("x", "openai", {
      prefs,
      isCurrent: () => true,
      sinks,
      io,
    });

    expect(sinks.setFailed).toHaveBeenCalledWith(true);
    expect(io.reportError).toHaveBeenCalledTimes(1);
  });
});
