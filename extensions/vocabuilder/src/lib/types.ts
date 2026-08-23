import { z } from "zod";

export const PART_OF_SPEECH_VALUES = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "numeral",
  "particle",
  "auxiliary verb",
  "phrasal verb",
  "idiom",
  "expression",
] as const;

export const PartOfSpeechSchema = z.enum(PART_OF_SPEECH_VALUES);
export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;

export const WordSenseSchema = z.object({
  translation: z.string(),
  partOfSpeech: PartOfSpeechSchema,
  example: z.string(),
  exampleTranslation: z.string(),
});

export const GeminiWordResponseSchema = z.object({
  senses: z.array(WordSenseSchema).max(5),
  correctedWord: z.string().optional(),
  notAWord: z.boolean().optional(),
});

export const GeminiApiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(z.object({ text: z.string() })),
      }),
    }),
  ),
});

export const GeminiTextResponseSchema = z.object({
  translation: z.string(),
});

export const GeminiWordResponseJsonSchema = {
  type: "object",
  properties: {
    senses: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          translation: {
            type: "string",
            description: "Target-language gloss for this sense.",
          },
          partOfSpeech: {
            type: "string",
            enum: PART_OF_SPEECH_VALUES,
            description:
              'Part of speech label. Use "phrasal verb", "idiom", or "expression" for multi-word items; "expression" is a catch-all for borderline cases.',
          },
          example: {
            type: "string",
            description: "Natural target-language example sentence.",
          },
          exampleTranslation: {
            type: "string",
            description: "Source-language example sentence containing the source item or corrected item.",
          },
        },
        required: ["translation", "partOfSpeech", "example", "exampleTranslation"],
        additionalProperties: false,
        propertyOrdering: ["translation", "partOfSpeech", "example", "exampleTranslation"],
      },
    },
    correctedWord: {
      type: "string",
      description: "Corrected source item. Include only when the input was misspelled.",
    },
    notAWord: {
      type: "boolean",
      description: "True only when no plausible word or expression correction exists.",
    },
  },
  required: ["senses"],
  additionalProperties: false,
  propertyOrdering: ["senses", "correctedWord", "notAWord"],
} as const;

export const GeminiTextResponseJsonSchema = {
  type: "object",
  properties: {
    translation: {
      type: "string",
      description: "Translated text in the target language.",
    },
  },
  required: ["translation"],
  additionalProperties: false,
  propertyOrdering: ["translation"],
} as const;

export const TranslationSchema = z.object({
  id: z.string(),
  word: z.string(),
  translation: z.string(),
  partOfSpeech: z.string(),
  example: z.string(),
  exampleTranslation: z.string(),
  timestamp: z.number(),
  type: z.enum(["word", "text"]),
});

export type WordSense = z.infer<typeof WordSenseSchema>;
export type GeminiWordResponse = z.infer<typeof GeminiWordResponseSchema>;
export type GeminiTextResponse = z.infer<typeof GeminiTextResponseSchema>;
export type Translation = z.infer<typeof TranslationSchema>;

export const FlashcardProgressSchema = z.object({
  word: z.string(),
  translationId: z.string(),
  easeFactor: z.number(),
  interval: z.number(),
  repetitions: z.number(),
  nextReviewDate: z.number(),
});

export type FlashcardProgress = z.infer<typeof FlashcardProgressSchema>;
export type Rating = "again" | "good" | "easy";

export const GeminiTtsResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z
            .array(
              z.object({
                inlineData: z.object({
                  mimeType: z.string(),
                  data: z.string(),
                }),
              }),
            )
            .min(1),
        }),
      }),
    )
    .min(1),
});
