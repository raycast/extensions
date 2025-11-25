import { describe, expect, test } from "vitest";
import { TypingPrompt } from "../views/components/TypingPrompt";
import type { SessionConfig, SessionState } from "../types";

const baseConfig: SessionConfig = {
  durationSec: 60,
  difficulty: 2,
  romajiProfile: "hepburn",
  showReading: true,
  practiceMode: "word",
};

const baseSession: SessionState = {
  id: "sess-test",
  phase: "running",
  readingUnits: ["あ", "い", "う"],
  cursorUnitIndex: 1,
  typedBuffer: "",
  typedHistory: "a",
  metrics: {
    cpm: 120,
    wpm: 24,
    accuracy: 1,
    mistakes: 0,
    streakMax: 0,
    skips: 0,
  },
  score: {
    correct: 1,
    total: 1,
    mistakes: 0,
    streak: 1,
    streakMax: 1,
    skips: 0,
    startedAt: Date.now(),
  },
  config: baseConfig,
  target: {
    id: "item-1",
    text: "あいう",
    reading: "あいう",
    romaji: "aiu",
    difficulty: 1,
    mode: "word",
  },
  feedback: { kind: "progress", timestamp: Date.now() },
  completedWords: 0,
};

describe("TypingPrompt", () => {
  test("renders caret with segmented prompt", () => {
    const result = TypingPrompt({ sessionState: baseSession, config: baseConfig });
    expect(result.markdown).toContain("▌");
    expect(result.markdown).toContain("a");
    expect(result.markdown).toContain("i");
    expect(result.markdown).toContain("u");
    expect(result.readingLine).toContain("Romaji: aiu");
  });

  test("marks current segment as error when feedback is error", () => {
    const session: SessionState = {
      ...baseSession,
      feedback: { kind: "error", timestamp: Date.now(), attempted: "x" },
    };
    const result = TypingPrompt({ sessionState: session, config: baseConfig });
    expect(result.markdown).toContain("~~▌");
  });

  test("shows typed buffer when it matches current prefix", () => {
    const session: SessionState = {
      ...baseSession,
      typedBuffer: "k",
      readingUnits: ["か", "き"],
      cursorUnitIndex: 1,
      typedHistory: "kak",
      target: { ...baseSession.target!, reading: "かき", romaji: "kaki" },
    };
    const result = TypingPrompt({ sessionState: session, config: baseConfig });
    expect(result.markdown).toContain("k▌i");
  });

  test("omits reading line for sentence mode", () => {
    const config: SessionConfig = { ...baseConfig, practiceMode: "sentence" };
    const session: SessionState = { ...baseSession, config };
    const result = TypingPrompt({ sessionState: session, config });
    expect(result.readingLine).toBeUndefined();
  });

  test("provides structured progress data", () => {
    const result = TypingPrompt({ sessionState: baseSession, config: baseConfig });
    expect(result.progress.totalUnits).toBe(3);
    expect(result.progress.completedUnits).toBe(1);
    expect(result.progress.percent).toBe(33);
  });
});
