import { ApiProcedure, JsonObject, JsonPrimitive, JsonSchema, JsonValue, SchemaType } from "../types/api";
import { isJsonObject, parseJsonValue } from "./json";

export type ProcedureFormValues = Record<string, boolean | string>;

export class FormValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "FormValidationError";
  }
}

export function effectiveSchema(schema: JsonSchema): JsonSchema {
  if (schema.type) {
    return schema;
  }

  const nonNullOption = schema.anyOf?.find((option) => option.type !== "null");
  return nonNullOption ?? schema;
}

export function schemaType(schema: JsonSchema): SchemaType | "json" {
  const effective = effectiveSchema(schema);
  if (effective.type) {
    return effective.type;
  }

  const sample = effective.enum?.[0] ?? effective.const;
  if (typeof sample === "string") return "string";
  if (typeof sample === "number") return Number.isInteger(sample) ? "integer" : "number";
  if (typeof sample === "boolean") return "boolean";
  if (sample === null) return "null";
  return "json";
}

export function enumValues(schema: JsonSchema): JsonPrimitive[] | undefined {
  return effectiveSchema(schema).enum;
}

export function defaultFormValue(schema: JsonSchema): boolean | string | undefined {
  const effective = effectiveSchema(schema);
  const defaultValue = effective.default;
  if (typeof defaultValue === "boolean") {
    return defaultValue;
  }
  if (typeof defaultValue === "string" || typeof defaultValue === "number") {
    return String(defaultValue);
  }
  if (defaultValue !== undefined) {
    return JSON.stringify(defaultValue, null, 2);
  }
  return undefined;
}

function validateString(field: string, value: string, schema: JsonSchema): string {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    throw new FormValidationError(field, `${field} must contain at least ${schema.minLength} characters.`);
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    throw new FormValidationError(field, `${field} must contain at most ${schema.maxLength} characters.`);
  }
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    throw new FormValidationError(field, `${field} does not match the required format.`);
  }
  return value;
}

function validateNumber(field: string, rawValue: string, schema: JsonSchema, integer: boolean): number {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    throw new FormValidationError(field, `${field} must be ${integer ? "an integer" : "a number"}.`);
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    throw new FormValidationError(field, `${field} must be at least ${schema.minimum}.`);
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    throw new FormValidationError(field, `${field} must be at most ${schema.maximum}.`);
  }
  return value;
}

function validateCollection(field: string, value: JsonValue, schema: JsonSchema): JsonValue {
  if (schema.type === "array" && !Array.isArray(value)) {
    throw new FormValidationError(field, `${field} must be a JSON array.`);
  }
  if (schema.type === "object" && !isJsonObject(value)) {
    throw new FormValidationError(field, `${field} must be a JSON object.`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      throw new FormValidationError(field, `${field} must contain at least ${schema.minItems} items.`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      throw new FormValidationError(field, `${field} must contain at most ${schema.maxItems} items.`);
    }
  }
  return value;
}

function coerceValue(field: string, rawValue: boolean | string, schema: JsonSchema): JsonValue {
  const effective = effectiveSchema(schema);
  const type = schemaType(effective);

  if (enumValues(effective)) {
    const parsed = parseJsonValue(String(rawValue), field);
    if (!effective.enum?.some((candidate) => Object.is(candidate, parsed))) {
      throw new FormValidationError(field, `${field} must use one of the catalog values.`);
    }
    return parsed;
  }

  if (type === "boolean") {
    return typeof rawValue === "boolean" ? rawValue : rawValue === "true";
  }
  if (type === "string") {
    return validateString(field, String(rawValue), effective);
  }
  if (type === "integer" || type === "number") {
    return validateNumber(field, String(rawValue), effective, type === "integer");
  }
  if (type === "null") {
    return null;
  }

  const parsed = parseJsonValue(String(rawValue), field);
  return validateCollection(field, parsed, effective);
}

export function buildProcedureInput(procedure: ApiProcedure, values: ProcedureFormValues): JsonObject {
  const properties = procedure.inputSchema.properties ?? {};
  const required = new Set(procedure.inputSchema.required ?? []);
  const input: JsonObject = {};

  for (const [field, schema] of Object.entries(properties)) {
    const rawValue = values[field];
    const missing = rawValue === undefined || rawValue === "";
    if (missing) {
      if (required.has(field)) {
        throw new FormValidationError(field, `${field} is required.`);
      }
      continue;
    }
    input[field] = coerceValue(field, rawValue, schema);
  }

  return input;
}

export function schemaHint(schema: JsonSchema, required: boolean): string {
  const effective = effectiveSchema(schema);
  const parts = [required ? "Required" : "Optional", schemaType(effective)];
  if (effective.minLength !== undefined || effective.maxLength !== undefined) {
    parts.push(`length ${effective.minLength ?? 0}–${effective.maxLength ?? "∞"}`);
  }
  if (effective.minimum !== undefined || effective.maximum !== undefined) {
    parts.push(`range ${effective.minimum ?? "−∞"}–${effective.maximum ?? "∞"}`);
  }
  if (effective.format) {
    parts.push(effective.format);
  }
  return parts.join(" · ");
}
