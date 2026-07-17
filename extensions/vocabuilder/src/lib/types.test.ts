import { describe, it, expect } from "vitest";
import {
  FlashcardProgressSchema,
  GeminiTextResponseJsonSchema,
  GeminiTtsResponseSchema,
  GeminiWordResponseJsonSchema,
  PART_OF_SPEECH_VALUES,
} from "./types";

describe("Gemini structured output JSON schemas", () => {
  it("keeps word response JSON schema aligned with required sense fields", () => {
    expect(GeminiWordResponseJsonSchema).toMatchObject({
      type: "object",
      required: ["senses"],
      properties: {
        senses: {
          maxItems: 5,
          items: {
            required: ["translation", "partOfSpeech", "example", "exampleTranslation"],
          },
        },
      },
    });
  });

  it("constrains partOfSpeech to the shared enum so Gemini cannot return arbitrary labels", () => {
    expect(GeminiWordResponseJsonSchema.properties.senses.items.properties.partOfSpeech.enum).toEqual(
      PART_OF_SPEECH_VALUES,
    );
  });

  it("keeps text response JSON schema aligned with the translation payload", () => {
    expect(GeminiTextResponseJsonSchema).toMatchObject({
      type: "object",
      required: ["translation"],
      properties: {
        translation: { type: "string" },
      },
    });
  });
});

describe("GeminiTtsResponseSchema", () => {
  // Empty `data` is intentionally allowed here so `tts.ts` can route it to a
  // distinct `empty-response` Gemini error (separate from `invalid-response`).
  // Structural shape must still pass — empty arrays do not.
  it("accepts empty audio payloads at the schema boundary so tts.ts can route them as empty-response", () => {
    expect(
      GeminiTtsResponseSchema.safeParse({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;rate=24000", data: "" } }] } }],
      }).success,
    ).toBe(true);
  });

  it("rejects structurally empty responses (no candidates, no parts)", () => {
    expect(GeminiTtsResponseSchema.safeParse({ candidates: [] }).success).toBe(false);
    expect(
      GeminiTtsResponseSchema.safeParse({
        candidates: [{ content: { parts: [] } }],
      }).success,
    ).toBe(false);
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

  it("keeps spaced-repetition progress keyed by translation id", () => {
    expect(() => FlashcardProgressSchema.parse(valid)).not.toThrow();

    const incomplete: Record<string, unknown> = { ...valid };
    delete incomplete.translationId;
    expect(() => FlashcardProgressSchema.parse(incomplete)).toThrow();
  });
});
