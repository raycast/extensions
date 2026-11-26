/**
 * Validation schemas using Zod
 * Provides type-safe validation and structured field errors for all form inputs
 */

import { z } from "zod";
import { LIMITS } from "../constants";

const POSITIVE_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const POSITIVE_INT_PATTERN = /^\d+$/;

function parsePositiveNumber(val: string): number | null {
  const trimmed = val.trim();
  if (!POSITIVE_DECIMAL_PATTERN.test(trimmed)) {
    return null;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parsePositiveInt(val: string): number | null {
  const trimmed = val.trim();
  if (!POSITIVE_INT_PATTERN.test(trimmed)) {
    return null;
  }
  const num = Number(trimmed);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

const optionalPositiveIntString = z
  .string()
  .optional()
  .transform((val, ctx) => {
    if (!val || val.trim() === "") {
      return undefined;
    }
    const parsed = parsePositiveInt(val);
    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: "Amount must be a positive whole number",
      });
      return z.NEVER;
    }
    if (parsed > LIMITS.SADAQAH_AMOUNT_MAX) {
      ctx.addIssue({
        code: "custom",
        message: `Amount must be ${LIMITS.SADAQAH_AMOUNT_MAX} or less`,
      });
      return z.NEVER;
    }
    return parsed;
  });

const optionalPositiveNumberString = z
  .string()
  .optional()
  .transform((val, ctx) => {
    if (!val || val.trim() === "") {
      return undefined;
    }
    const parsed = parsePositiveNumber(val);
    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: "Value must be a positive number",
      });
      return z.NEVER;
    }
    return parsed;
  });

const requiredPositiveNumberString = z
  .string()
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, "Value is required")
  .transform((val, ctx) => {
    const parsed = parsePositiveNumber(val);
    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: "Value must be greater than 0",
      });
      return z.NEVER;
    }
    return parsed;
  });

// Box validation schemas
export const createBoxSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, "Name is required")
        .max(LIMITS.BOX_NAME_MAX, `Name must be ${LIMITS.BOX_NAME_MAX} characters or less`),
    ),
  description: z
    .string()
    .max(LIMITS.BOX_DESCRIPTION_MAX, `Description must be ${LIMITS.BOX_DESCRIPTION_MAX} characters or less`)
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  baseCurrencyId: z.string().optional(),
});

export const updateBoxSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, "Name is required")
        .max(LIMITS.BOX_NAME_MAX, `Name must be ${LIMITS.BOX_NAME_MAX} characters or less`),
    )
    .optional(),
  // Preserve empty string "" so clearing an existing description sends "" to the API
  description: z
    .string()
    .max(LIMITS.BOX_DESCRIPTION_MAX, `Description must be ${LIMITS.BOX_DESCRIPTION_MAX} characters or less`)
    .transform((val) => val.trim())
    .optional(),
  baseCurrencyId: z.string().optional(),
});

// Sadaqah validation schema
export const addSadaqahSchema = z
  .object({
    amount: optionalPositiveIntString,
    value: optionalPositiveNumberString,
    currencyId: z.string().optional(),
  })
  .refine((data) => data.amount !== undefined || data.value !== undefined, {
    message: "Either amount or value is required",
    path: ["value"],
  });

// Preset validation schema (accepts form string inputs directly)
export const presetFormSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, "Name is required")
        .max(LIMITS.PRESET_NAME_MAX, `Name must be ${LIMITS.PRESET_NAME_MAX} characters or less`),
    ),
  value: requiredPositiveNumberString,
  currencyId: z.string().min(1, "Currency is required"),
  amount: optionalPositiveIntString,
});

export function calculateTotalValue(value: number, amount: number = 1): number {
  return Number((value * amount).toPrecision(12));
}

// Type inference
export type CreateBoxInput = z.infer<typeof createBoxSchema>;
export type UpdateBoxInput = z.infer<typeof updateBoxSchema>;
export type AddSadaqahInput = z.infer<typeof addSadaqahSchema>;
export type PresetFormInput = z.infer<typeof presetFormSchema>;

export type ValidationResult<T> =
  { success: true; data: T } | { success: false; errors: string[]; fieldErrors: Record<string, string> };

/**
 * Validate data against a Zod schema and return structured field errors
 */
export function validateInput<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: Record<string, string> = {};
  const errors: string[] = [];

  for (const issue of result.error.issues) {
    const field = issue.path.join(".");
    if (field && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
    errors.push(field ? `${field}: ${issue.message}` : issue.message);
  }

  return { success: false, errors, fieldErrors };
}

/**
 * Validate a single field from a Zod object schema (for @raycast/utils useForm)
 */
export function validateField<T extends Record<string, z.ZodType>>(
  schema: z.ZodObject<T>,
  field: keyof T & string,
  value: unknown,
): string | undefined {
  const fieldSchema = schema.shape[field];
  if (!fieldSchema) {
    return undefined;
  }
  const result = fieldSchema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}
