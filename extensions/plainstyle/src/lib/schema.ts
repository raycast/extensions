import { z } from "zod";

export const CHARACTER_SET = z.union([
  z.literal("REGULAR"),
  z.literal("SERIF_BOLD"),
  z.literal("SERIF_ITALIC"),
  z.literal("SERIF_BOLD_ITALIC"),
  z.literal("SANS_SERIF"),
  z.literal("SANS_SERIF_BOLD"),
  z.literal("SANS_SERIF_ITALIC"),
  z.literal("SANS_SERIF_BOLD_ITALIC"),
  z.literal("SCRIPT"),
  z.literal("SCRIPT_BOLD"),
  z.literal("MONOSPACE"),
  z.literal("FRAKTUR"),
  z.literal("DOUBLE_STRUCK"),
  z.literal("WIDE"),
  z.literal("CIRCLED_WHITE"),
  z.literal("CIRCLED_BLACK"),
  z.literal("DOUBLE_CIRCLED"),
  z.literal("PARENTHESIZED"),
  z.literal("SQUARED_BLACK"),
  z.literal("SQUARED_WHITE"),
]);

export type CharacterSet = z.infer<typeof CHARACTER_SET>;

export const LETTER_SET = z.object({
  name: z.string(),
  description: z.string(),
  characters: z.record(z.string(), z.string()),
});

export type LetterSet = z.infer<typeof LETTER_SET>;
