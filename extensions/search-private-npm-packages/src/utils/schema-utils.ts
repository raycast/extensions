import { ZodTypeAny, z } from "zod";

/**
 * Validate a schema against data
 * @param schema The schema to validate against
 * @param data The data to validate
 * @returns True if the data is valid, false otherwise
 */
export function validateSchema<T extends ZodTypeAny>(schema: T, data: unknown): data is z.infer<T> {
  try {
    schema.parse(data);
    return true;
  } catch (err) {
    return false;
  }
}
