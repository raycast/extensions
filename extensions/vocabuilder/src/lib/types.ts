import { z } from "zod";

export const WordSenseSchema = z.object({
  translation: z.string(),
  partOfSpeech: z.string(),
  example: z.string(),
  exampleTranslation: z.string(),
});

export const GeminiWordResponseSchema = z.object({
  senses: z.array(WordSenseSchema).min(1).max(5),
  correctedWord: z.string().optional(),
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
