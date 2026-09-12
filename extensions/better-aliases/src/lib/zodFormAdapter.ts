import type { z } from "zod";

/**
 * Raycast useForm validation function signature
 */
type FormValidationFn<T> = (value: T | undefined) => string | undefined;

/**
 * Raycast useForm validation object
 */
type FormValidation<T extends Record<string, unknown>> = {
  [K in keyof T]?: FormValidationFn<T[K]>;
};

/**
 * Options for creating form validation from Zod schema
 */
interface ZodFormAdapterOptions<T extends Record<string, unknown>> {
  /** Custom validation functions to run after Zod validation */
  customValidation?: Partial<FormValidation<T>>;
  /** Context values needed for validation (e.g., mode, initialValues) */
  context?: Record<string, unknown>;
}

/**
 * Converts a Zod object schema to Raycast useForm validation object
 */
export function createFormValidation<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  options: ZodFormAdapterOptions<z.infer<z.ZodObject<T>>> = {},
): FormValidation<z.infer<z.ZodObject<T>>> {
  const { customValidation = {} } = options;
  type FormValues = z.infer<z.ZodObject<T>>;

  const validation: FormValidation<FormValues> = {};

  for (const key of Object.keys(schema.shape) as Array<keyof T>) {
    const fieldSchema = schema.shape[key];

    validation[key as keyof FormValues] = (value) => {
      // Run Zod validation
      const result = (fieldSchema as unknown as z.ZodTypeAny).safeParse(value);
      if (!result.success) {
        return result.error.issues[0]?.message || "Invalid value";
      }

      // Run custom validation if provided
      const customValidator = (customValidation as Record<string, FormValidationFn<unknown> | undefined>)[
        key as string
      ];
      if (customValidator) {
        return customValidator(value);
      }

      return undefined;
    };
  }

  return validation;
}

/**
 * Validates a single field against a Zod schema
 */
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    return result.error.issues[0]?.message || "Invalid value";
  }
  return undefined;
}

/**
 * Validates entire form data and returns field-specific errors
 */
export function validateForm<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  data: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(data);
  if (result.success) return null;

  const errors: Record<string, string> = {};
  for (const error of result.error.issues) {
    const path = error.path.join(".");
    if (!errors[path]) {
      errors[path] = error.message;
    }
  }
  return errors;
}
