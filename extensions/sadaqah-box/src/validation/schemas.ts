/**
 * Validation schemas using Zod
 * Provides type-safe validation for all form inputs
 */

import { z } from "zod";

// Box validation schemas
export const createBoxSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  baseCurrencyId: z.string().optional(),
});

export const updateBoxSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .transform((val) => val.trim())
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  baseCurrencyId: z.string().optional(),
});

// Sadaqah validation schemas
export const addSadaqahSchema = z.object({
  amount: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0), "Amount must be a positive number")
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  value: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), "Value must be a positive number")
    .transform((val) => (val ? parseFloat(val) : undefined)),
  currencyId: z.string().optional(),
});

// Preset validation schemas
export const createPresetSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .transform((val) => val.trim()),
  value: z.number().positive("Value must be greater than 0"),
  currencyId: z.string().min(1, "Currency is required"),
  amount: z.number().positive().optional(),
});

// Type inference
export type CreateBoxInput = z.infer<typeof createBoxSchema>;
export type UpdateBoxInput = z.infer<typeof updateBoxSchema>;
export type AddSadaqahInput = z.infer<typeof addSadaqahSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;

// Validation helper function
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  return { success: false, errors };
}
