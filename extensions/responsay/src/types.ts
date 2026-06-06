import { z } from "zod";

export const ToneSchema = z.enum([
  "fall",
  "rise",
  "fall-rise",
  "rise-fall",
  "level",
]);
export const LinkSchema = z
  .enum(["liaison", "elision", "intrusion"])
  .nullable();

export const WordSchema = z
  .object({
    text: z.string().min(1),
    syllables: z.array(z.string().min(1)).min(1),
    stressIndex: z.number().int().nonnegative().nullable(),
    stressed: z.boolean(),
    nuclear: z.boolean(),
    ipa: z.string().optional(),
    linkToNext: LinkSchema.optional(),
  })
  .refine((w) => !w.nuclear || w.stressed, {
    message: "A nuclear word must also be stressed",
  })
  .refine((w) => !w.stressed || w.stressIndex !== null, {
    message: "A stressed word must have a non-null stressIndex",
  })
  .refine((w) => w.stressIndex === null || w.stressIndex < w.syllables.length, {
    message: "stressIndex must be a valid syllable index",
  });

export const ThoughtGroupSchema = z.object({
  tone: ToneSchema,
  words: z.array(WordSchema).min(1),
});

export const ProsodyAnalysisSchema = z.object({
  text: z.string().min(1),
  isGeneratedExample: z.boolean(),
  sourceWord: z.string().optional(),
  ipa: z.string(),
  thoughtGroups: z.array(ThoughtGroupSchema).min(1),
  notes: z.string().optional(),
});

export type Tone = z.infer<typeof ToneSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Word = z.infer<typeof WordSchema>;
export type ThoughtGroup = z.infer<typeof ThoughtGroupSchema>;
export type ProsodyAnalysis = z.infer<typeof ProsodyAnalysisSchema>;
