import { describe, it, expect } from "vitest";
import {
  FlashcardProgressSchema,
  TextResponseJsonSchema,
  WordResponseJsonSchema,
  PART_OF_SPEECH_VALUES,
  REGISTER_VALUES,
  TranslationSchema,
  WordSenseSchema,
} from "./types";

describe("structured output JSON schemas", () => {
  it("keeps word response JSON schema aligned with required sense fields", () => {
    expect(WordResponseJsonSchema).toMatchObject({
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

  it("constrains partOfSpeech to the shared enum so the model cannot return arbitrary labels", () => {
    expect(WordResponseJsonSchema.properties.senses.items.properties.partOfSpeech.enum).toEqual(PART_OF_SPEECH_VALUES);
  });

  // The JSON schema handed to the provider is hand-written; the Zod schema validates
  // what comes back. A field added to one and not the other either never gets
  // requested or gets silently dropped, so pin them to the same key set.
  it("declares exactly the sense fields the Zod schema validates", () => {
    const jsonKeys = Object.keys(WordResponseJsonSchema.properties.senses.items.properties);
    expect(new Set(jsonKeys)).toEqual(new Set(Object.keys(WordSenseSchema.shape)));
    expect(new Set(WordResponseJsonSchema.properties.senses.items.propertyOrdering)).toEqual(new Set(jsonKeys));
  });

  it("constrains register to the shared enum", () => {
    expect(WordResponseJsonSchema.properties.senses.items.properties.register.enum).toEqual(REGISTER_VALUES);
  });

  it("keeps text response JSON schema aligned with the translation payload", () => {
    expect(TextResponseJsonSchema).toMatchObject({
      type: "object",
      required: ["translation"],
      properties: {
        translation: { type: "string" },
      },
    });
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

describe("TranslationSchema", () => {
  // getHistory quarantines the whole array when one row fails to parse, so a
  // history written before the dictionary fields existed must still validate.
  it("accepts history rows saved before transcription, forms and register existed", () => {
    expect(
      TranslationSchema.safeParse({
        id: "rapture-1700000000000",
        word: "rapture",
        translation: "\u0437\u0430\u0445\u043e\u043f\u043b\u0435\u043d\u043d\u044f",
        partOfSpeech: "noun",
        example:
          "\u0412\u043e\u043d\u0430 \u0441\u043b\u0443\u0445\u0430\u043b\u0430 \u0456\u0437 \u0437\u0430\u0445\u043e\u043f\u043b\u0435\u043d\u043d\u044f\u043c.",
        exampleTranslation: "She listened with rapture.",
        timestamp: 1700000000000,
        type: "word",
      }).success,
    ).toBe(true);
  });
});
