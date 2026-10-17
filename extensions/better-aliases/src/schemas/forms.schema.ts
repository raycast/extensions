import { z } from "zod";

/**
 * Base alias form schema with common validations
 */
export const aliasFormSchema = z.object({
  alias: z.string().min(1, "Alias is required").regex(/^\S+$/, "Alias cannot contain whitespace"),
  value: z.string().min(1, "Value is required"),
  label: z.string().optional(),
  snippetOnly: z.boolean().default(false),
});

export type AliasFormValues = z.infer<typeof aliasFormSchema>;

/**
 * Creates a snippet-aware form schema with dynamic separator validation
 */
export function createAliasFormSchemaWithSnippet(separator: string) {
  return aliasFormSchema.superRefine((data, ctx) => {
    if (data.snippetOnly && data.value.includes(separator)) {
      const options = data.value
        .split(separator)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `When using "${separator}" separator, provide at least 2 variations`,
          path: ["value"],
        });
      }
    }
  });
}
