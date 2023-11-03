import type { AnyObjectSchema } from "yup";
import * as yup from "yup";
import * as schemas from "./schemas";

export type ValidationErrors<T> = Record<keyof T, string | undefined>;

const validateField = ({
  schema,
  field,
  value,
}: {
  schema: AnyObjectSchema;
  field: string;
  value: Record<string, unknown>;
}): { error: string | null } => {
  try {
    schema.validateSyncAt(field, value);
    return { error: null };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return { error: error.errors[0] };
    }
    return { error: "Unknown error validating field" };
  }
};

export const checkIfEmpty = <T>(values: Partial<Record<keyof T, unknown>>, check: Array<keyof T>): boolean => {
  const fields = Object.keys(values).filter((key) => check.includes(key as keyof T));
  return fields.some((field) => values[field as keyof T] === "");
};

export const validation = {
  validate: {
    field: validateField,
    empty: checkIfEmpty,
  },
  schemas,
};
