import type { Form } from "@raycast/api";
import type { useForm } from "@raycast/utils";
import { z, ZodObject, type ZodType } from "zod";

type Validation<T extends Form.Values> = Parameters<typeof useForm<T>>[0]["validation"];

export const zodFieldResolver =
  <T>(schema: ZodType<T>) =>
  (value: T | undefined) => {
    const result = schema.safeParse(value);
    if (result.success) {
      return undefined;
    } else {
      return z.prettifyError(result.error);
    }
  };

export const zodResolver = <T extends Form.Values>(schema: ZodType<T>, init: Validation<T> = {}): Validation<T> => {
  const validation: Validation<T> = { ...init };

  if (schema instanceof ZodObject) {
    for (const key in schema.shape as ZodObject<T>["shape"]) {
      validation[key] ||= zodFieldResolver(schema.shape[key]);
    }
  }

  return validation;
};
