import type { ToolSchema } from "./types";

export type EnumValue = string | number | boolean;

export interface ToolFormEnumOption {
  id: string;
  title: string;
  value: EnumValue;
}

export interface ToolFormField {
  id: string;
  path: string[];
  title: string;
  description?: string;
  required: boolean;
  kind: "string" | "number" | "integer" | "boolean" | "enum";
  enumOptions?: ToolFormEnumOption[];
}

export type ToolInputPlan =
  { mode: "fields"; fields: ToolFormField[] } | { mode: "empty" } | { mode: "json"; reason: string };

export class ToolInputError extends Error {
  constructor(
    message: string,
    readonly fieldId?: string,
  ) {
    super(message);
    this.name = "ToolInputError";
  }
}

type SchemaRecord = Record<string, unknown>;

const UNSUPPORTED_KEYWORDS = [
  "allOf",
  "anyOf",
  "const",
  "contains",
  "dependentSchemas",
  "else",
  "if",
  "items",
  "not",
  "oneOf",
  "patternProperties",
  "prefixItems",
  "then",
  "unevaluatedProperties",
];

function isRecord(value: unknown): value is SchemaRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record: SchemaRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function defineValue(target: SchemaRecord, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function pointerPart(value: string): string {
  return value.replace(/~1/g, "/").replace(/~0/g, "~");
}

function localReference(root: SchemaRecord, definitions: SchemaRecord | undefined, reference: string): unknown {
  if (!reference.startsWith("#/")) return undefined;

  const parts = reference.slice(2).split("/").map(pointerPart);
  let value: unknown = root;
  for (const part of parts) {
    if (!isRecord(value) || !hasOwn(value, part)) {
      value = undefined;
      break;
    }
    value = value[part];
  }
  if (value !== undefined) return value;

  if (definitions && parts.length === 2 && ["$defs", "definitions", "schemaDefinitions"].includes(parts[0])) {
    return hasOwn(definitions, parts[1]) ? definitions[parts[1]] : undefined;
  }
  return undefined;
}

function resolveSchema(
  candidate: unknown,
  root: SchemaRecord,
  definitions: SchemaRecord | undefined,
  references: Set<string>,
): SchemaRecord | undefined {
  if (!isRecord(candidate)) return undefined;
  if (typeof candidate.$ref !== "string") return candidate;

  const reference = candidate.$ref;
  const siblingKeys = Object.keys(candidate).filter(
    (key) => !["$ref", "$defs", "definitions", "default", "description", "title"].includes(key),
  );
  if (siblingKeys.length > 0 || references.has(reference)) return undefined;

  const referenced = localReference(root, definitions, reference);
  if (!referenced) return undefined;

  const nextReferences = new Set(references);
  nextReferences.add(reference);
  const resolved = resolveSchema(referenced, root, definitions, nextReferences);
  if (!resolved) return undefined;

  const merged: SchemaRecord = Object.create(null);
  for (const [key, value] of Object.entries(resolved)) defineValue(merged, key, value);
  for (const key of ["default", "description", "title"]) {
    if (hasOwn(candidate, key)) defineValue(merged, key, candidate[key]);
  }
  return merged;
}

function schemaType(schema: SchemaRecord): string | undefined {
  if (typeof schema.type === "string") return schema.type;
  if (schema.type !== undefined) return undefined;
  if (isRecord(schema.properties)) return "object";

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const types = new Set(schema.enum.map((value) => typeof value));
    if (types.size === 1) return [...types][0];
  }
  return undefined;
}

function enumOptions(schema: SchemaRecord): ToolFormEnumOption[] | undefined {
  if (!Array.isArray(schema.enum) || schema.enum.length === 0) return undefined;
  if (!schema.enum.every((value) => ["string", "number", "boolean"].includes(typeof value))) return undefined;

  const values = schema.enum as EnumValue[];
  const types = new Set(values.map((value) => typeof value));
  if (types.size !== 1) return undefined;
  if (
    schemaType(schema) === "integer" &&
    !values.every((value) => typeof value === "number" && Number.isInteger(value))
  ) {
    return undefined;
  }

  return values.map((value, index) => ({
    id: `enum_${index}`,
    title: String(value),
    value,
  }));
}

function unsupportedKeyword(schema: SchemaRecord): string | undefined {
  return UNSUPPORTED_KEYWORDS.find((keyword) => hasOwn(schema, keyword));
}

function fieldTitle(path: string[], schema: SchemaRecord): string {
  if (typeof schema.title === "string" && schema.title.trim()) return schema.title;
  return path.join(" - ");
}

interface WalkContext {
  root: SchemaRecord;
  definitions?: SchemaRecord;
  fields: ToolFormField[];
}

function walkObject(
  candidate: unknown,
  path: string[],
  requiredByParent: boolean,
  context: WalkContext,
  references = new Set<string>(),
): string | undefined {
  const schema = resolveSchema(candidate, context.root, context.definitions, references);
  if (!schema) return "It contains an unresolved, cyclic, or unsupported reference.";

  const keyword = unsupportedKeyword(schema);
  if (keyword) return `It uses unsupported schema keyword "${keyword}".`;
  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    return "It accepts dynamic object properties.";
  }

  const type = schemaType(schema);
  if (type === "object") {
    const properties = schema.properties;
    if (properties === undefined) {
      return schema.additionalProperties === false ? undefined : "It accepts an open object payload.";
    }
    if (!isRecord(properties)) return "Its object properties are not a supported schema map.";
    if (Object.keys(properties).length === 0 && schema.additionalProperties !== false) {
      return "It accepts an open object payload.";
    }

    const required = schema.required === undefined ? [] : schema.required;
    if (!Array.isArray(required) || !required.every((key) => typeof key === "string")) {
      return "Its required property list is malformed.";
    }
    if (required.some((key) => !hasOwn(properties, key))) {
      return "Its required property list refers to an unknown field.";
    }

    for (const [key, property] of Object.entries(properties)) {
      const propertyPath = [...path, key];
      const resolved = resolveSchema(property, context.root, context.definitions, new Set(references));
      if (!resolved) return `Field "${propertyPath.join(".")}" has an unsupported reference.`;

      const propertyKeyword = unsupportedKeyword(resolved);
      if (propertyKeyword) return `Field "${propertyPath.join(".")}" uses "${propertyKeyword}".`;

      const propertyType = schemaType(resolved);
      if (propertyType === "object") {
        if (!required.includes(key)) {
          return `Optional object field "${propertyPath.join(".")}" needs JSON input to preserve conditional required fields.`;
        }
        const firstNestedField = context.fields.length;
        const reason = walkObject(property, propertyPath, required.includes(key), context, new Set(references));
        if (reason) return reason;
        if (!context.fields.slice(firstNestedField).some((field) => field.required)) {
          return `Required object field "${propertyPath.join(".")}" can be empty and needs JSON input.`;
        }
        continue;
      }

      const options = enumOptions(resolved);
      let kind: ToolFormField["kind"];
      if (Array.isArray(resolved.enum)) {
        if (!options) return `Field "${propertyPath.join(".")}" has an unsupported enum.`;
        kind = "enum";
      } else if (["string", "number", "integer", "boolean"].includes(propertyType ?? "")) {
        kind = propertyType as ToolFormField["kind"];
      } else {
        return `Field "${propertyPath.join(".")}" has unsupported type "${String(propertyType)}".`;
      }

      context.fields.push({
        id: `field_${context.fields.length}`,
        path: propertyPath,
        title: fieldTitle(propertyPath, resolved),
        description: typeof resolved.description === "string" ? resolved.description : undefined,
        required: requiredByParent && required.includes(key),
        kind,
        enumOptions: options,
      });
    }
    return undefined;
  }

  return path.length === 0 ? "Its root is not an object." : `Field "${path.join(".")}" is not supported.`;
}

export function createToolInputPlan(toolSchema: ToolSchema): ToolInputPlan {
  if (!isRecord(toolSchema.inputSchema)) {
    return { mode: "json", reason: "Executor did not provide an object input schema." };
  }

  const root = toolSchema.inputSchema;
  const definitions = isRecord(toolSchema.schemaDefinitions) ? toolSchema.schemaDefinitions : undefined;
  const context: WalkContext = { root, definitions, fields: [] };
  const reason = walkObject(root, [], true, context);
  if (reason) return { mode: "json", reason };
  if (context.fields.length === 0) return { mode: "empty" };
  return { mode: "fields", fields: context.fields };
}

function enumValue(field: ToolFormField, value: unknown): EnumValue {
  const option = field.enumOptions?.find((candidate) => candidate.id === value);
  if (option) return option.value;

  const direct = field.enumOptions?.find(
    (candidate) => typeof candidate.value === typeof value && candidate.value === value,
  );
  if (direct) return direct.value;
  throw new ToolInputError(`${field.title} must be one of the listed values.`, field.id);
}

function typedValue(field: ToolFormField, value: unknown): unknown {
  if (field.kind === "enum") return enumValue(field, value);
  if (field.kind === "string") {
    if (typeof value !== "string") throw new ToolInputError(`${field.title} must be text.`, field.id);
    return value;
  }
  if (field.kind === "boolean") {
    if (typeof value !== "boolean") throw new ToolInputError(`${field.title} must be true or false.`, field.id);
    return value;
  }

  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number)) throw new ToolInputError(`${field.title} must be a number.`, field.id);
  if (field.kind === "integer" && !Number.isInteger(number)) {
    throw new ToolInputError(`${field.title} must be a whole number.`, field.id);
  }
  return number;
}

function setPath(target: SchemaRecord, path: string[], value: unknown): void {
  let current = target;
  for (const key of path.slice(0, -1)) {
    const existing = hasOwn(current, key) ? current[key] : undefined;
    if (existing === undefined) {
      const nested: SchemaRecord = Object.create(null);
      defineValue(current, key, nested);
      current = nested;
    } else if (isRecord(existing)) {
      current = existing;
    } else {
      throw new ToolInputError(`Cannot safely construct field "${path.join(".")}".`);
    }
  }
  defineValue(current, path.at(-1) ?? "", value);
}

export function buildToolArguments(
  plan: Extract<ToolInputPlan, { mode: "fields" }>,
  values: Record<string, unknown>,
  includedFieldIds?: ReadonlySet<string>,
): Record<string, unknown> {
  const result: SchemaRecord = Object.create(null);

  for (const field of plan.fields) {
    const hasValue = hasOwn(values, field.id);
    const included = field.required || (includedFieldIds ? includedFieldIds.has(field.id) : hasValue);
    if (!included) continue;
    if (!hasValue || values[field.id] === undefined) {
      throw new ToolInputError(`${field.title} is required.`, field.id);
    }
    setPath(result, field.path, typedValue(field, values[field.id]));
  }

  return result;
}

function getPath(source: SchemaRecord, path: string[]): { found: boolean; value?: unknown } {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecord(current) || !hasOwn(current, key)) return { found: false };
    current = current[key];
  }
  return { found: true, value: current };
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameJsonValue(value, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => hasOwn(right, key) && sameJsonValue(left[key], right[key]))
  );
}

export interface ToolFormInitialValues {
  values: Record<string, unknown>;
  includedFieldIds: Set<string>;
}

/** Returns undefined when native controls cannot represent the preset losslessly. */
export function initialValuesForPlan(
  plan: Extract<ToolInputPlan, { mode: "fields" }>,
  initialArgs: Record<string, unknown>,
): ToolFormInitialValues | undefined {
  const values: Record<string, unknown> = Object.create(null);
  const includedFieldIds = new Set<string>();

  for (const field of plan.fields) {
    const initial = getPath(initialArgs, field.path);
    if (!initial.found) continue;

    let formValue: unknown = initial.value;
    if (field.kind === "enum") {
      const option = field.enumOptions?.find(
        (candidate) => typeof candidate.value === typeof initial.value && candidate.value === initial.value,
      );
      if (!option) return undefined;
      formValue = option.id;
    } else if (field.kind === "number" || field.kind === "integer") {
      if (typeof initial.value !== "number" || !Number.isFinite(initial.value)) return undefined;
      if (field.kind === "integer" && !Number.isInteger(initial.value)) return undefined;
      formValue = String(initial.value);
    } else if (field.kind === "string" && typeof initial.value !== "string") {
      return undefined;
    } else if (field.kind === "boolean" && typeof initial.value !== "boolean") {
      return undefined;
    }

    defineValue(values, field.id, formValue);
    includedFieldIds.add(field.id);
  }

  try {
    const reconstructed = buildToolArguments(plan, values, includedFieldIds);
    return sameJsonValue(reconstructed, initialArgs) ? { values, includedFieldIds } : undefined;
  } catch {
    return undefined;
  }
}

export function parseJsonArguments(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ToolInputError("Arguments must be valid JSON.");
  }
  if (!isRecord(parsed)) throw new ToolInputError("Arguments must be a JSON object.");
  return parsed;
}
