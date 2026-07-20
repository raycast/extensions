import { z } from "zod";
export const translationSchema = z
  .object({
    trans: z.string(),
    orig: z.string(),
    backend: z.number(),
  })
  .optional();
export const translitSchema = z
  .object({
    translit: z.string().optional(),
    src_translit: z.string().optional(),
  })
  .optional();
// Define the schema for reverse translation entries
const reverseTranslationEntrySchema = z.object({
  word: z.string(),
  reverse_translation: z.array(z.string()),
  score: z.number().optional(),
});
// Define the schema for dictionary entries
const dictionaryEntrySchema = z.object({
  pos: z.string(),
  terms: z.array(z.string()),
  entry: z.array(reverseTranslationEntrySchema),
  base_form: z.string(),
  pos_enum: z.number(),
});
// Define the schema for the spell checker (assuming its structure from your object)
const spellSchema = z.record(z.unknown());
const ldResult = z
  .object({
    srclangs: z.array(z.string()),
    srclangs_confidences: z.array(z.number()),
    extended_srclangs: z.array(z.string()),
  })
  .optional();
// Define the top-level schema combining all parts
export const googleTranslationSchema = z.object({
  sentences: z.array(z.union([translationSchema, translitSchema]).optional()).optional(),
  dict: z.array(dictionaryEntrySchema).optional(),
  src: z.string().optional(),
  ld_result: ldResult,
  spell: spellSchema,
  confidence: z.number().optional(),
});
