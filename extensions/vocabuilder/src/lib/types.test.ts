import { describe, it, expect } from "vitest";
import { FlashcardProgressSchema, GeminiWordResponseSchema, TranslationSchema, WordSenseSchema } from "./types";

describe("WordSenseSchema", () => {
  const valid = {
    translation: "привіт",
    partOfSpeech: "interjection",
    example: "Привіт!",
    exampleTranslation: "Hello!",
  };

  it("accepts a valid sense", () => {
    expect(() => WordSenseSchema.parse(valid)).not.toThrow();
  });

  it("rejects sense missing translation", () => {
    const incomplete: Record<string, unknown> = { ...valid };
    delete incomplete.translation;
    expect(() => WordSenseSchema.parse(incomplete)).toThrow();
  });
});

describe("GeminiWordResponseSchema", () => {
  const sense = {
    translation: "привіт",
    partOfSpeech: "interjection",
    example: "Привіт!",
    exampleTranslation: "Hello!",
  };

  it("accepts valid response without correctedWord", () => {
    const result = GeminiWordResponseSchema.parse({ senses: [sense] });
    expect(result.senses).toHaveLength(1);
    expect(result.correctedWord).toBeUndefined();
  });

  it("accepts multiple senses and correctedWord", () => {
    const result = GeminiWordResponseSchema.parse({
      senses: [sense, { ...sense, translation: "ало", partOfSpeech: "noun" }],
      correctedWord: "hello",
    });
    expect(result.senses).toHaveLength(2);
    expect(result.correctedWord).toBe("hello");
  });

  it("rejects empty senses array", () => {
    expect(() => GeminiWordResponseSchema.parse({ senses: [] })).toThrow();
  });

  it("rejects more than five senses", () => {
    const senses = Array.from({ length: 6 }, () => ({ ...sense }));
    expect(() => GeminiWordResponseSchema.parse({ senses })).toThrow();
  });
});

describe("TranslationSchema", () => {
  const validTranslation = {
    id: "abc-123",
    word: "hello",
    translation: "привіт",
    partOfSpeech: "interjection",
    example: "Hello!",
    exampleTranslation: "Привіт!",
    timestamp: Date.now(),
    type: "word",
  };

  it("accepts valid word-type translation", () => {
    expect(() => TranslationSchema.parse(validTranslation)).not.toThrow();
  });

  it("accepts valid text-type translation", () => {
    expect(() => TranslationSchema.parse({ ...validTranslation, type: "text" })).not.toThrow();
  });

  it("rejects invalid type value", () => {
    expect(() => TranslationSchema.parse({ ...validTranslation, type: "phrase" })).toThrow();
  });

  it("rejects missing required id field", () => {
    const noId: Record<string, unknown> = { ...validTranslation };
    delete noId.id;
    expect(() => TranslationSchema.parse(noId)).toThrow();
  });

  it("rejects missing required timestamp field", () => {
    const noTimestamp: Record<string, unknown> = { ...validTranslation };
    delete noTimestamp.timestamp;
    expect(() => TranslationSchema.parse(noTimestamp)).toThrow();
  });
});

describe("FlashcardProgressSchema", () => {
  const valid = {
    word: "hello",
    translationId: "hello-1",
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: 0,
  };

  it("requires translationId", () => {
    const incomplete: Record<string, unknown> = { ...valid };
    delete incomplete.translationId;
    expect(() => FlashcardProgressSchema.parse(incomplete)).toThrow();
  });

  it("accepts valid progress", () => {
    expect(() => FlashcardProgressSchema.parse(valid)).not.toThrow();
  });
});
