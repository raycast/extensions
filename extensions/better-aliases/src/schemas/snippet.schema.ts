import { z } from "zod";

/**
 * Result of snippet validation
 */
export const snippetValidationResultSchema = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
  options: z.array(z.string()),
});

export type SnippetValidation = z.infer<typeof snippetValidationResultSchema>;

/**
 * Creates a Zod schema for validating snippet body with a specific separator
 *
 * @param separator - The string used to separate snippet variations
 * @returns Zod schema that validates snippet content
 */
export function createSnippetBodySchema(separator: string) {
  return z
    .string()
    .min(1, "Snippet content is required")
    .superRefine((value, ctx) => {
      const trimmed = value.trim();

      if (!trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please provide snippet content",
        });
        return;
      }

      // Check for separator usage
      if (value.includes(separator)) {
        const options = value
          .split(separator)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (options.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `When using "${separator}" separator, please provide at least 2 snippets`,
          });
        }
      }
    });
}

/**
 * Validates and parses snippet options from body text
 */
export function parseSnippetOptionsSchema(separator: string) {
  return z.string().transform((value) => {
    return value
      .split(separator)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });
}
