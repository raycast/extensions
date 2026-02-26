import { z } from "zod";

export const GeminiResponseSchema = z.object({
  translation: z.string(),
  partOfSpeech: z.string(),
  example: z.string(),
  exampleTranslation: z.string(),
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

export const TranslationSchema = z.object({
  id: z.string(),
  word: z.string(),
  translation: z.string(),
  partOfSpeech: z.string(),
  example: z.string(),
  exampleTranslation: z.string(),
  timestamp: z.number(),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;
export type Translation = z.infer<typeof TranslationSchema>;

export const FlashcardProgressSchema = z.object({
  word: z.string(),
  easeFactor: z.number(),
  interval: z.number(),
  repetitions: z.number(),
  nextReviewDate: z.number(),
});

export type FlashcardProgress = z.infer<typeof FlashcardProgressSchema>;
export type Rating = "again" | "good" | "easy";
