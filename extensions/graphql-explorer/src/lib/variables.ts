import {
  getNamedType,
  GraphQLInputType,
  GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInputType,
  isListType,
  isNonNullType,
  isScalarType,
  Kind,
  print,
  typeFromAST,
  valueFromASTUntyped,
  VariableDefinitionNode,
} from "graphql";
import { RawValue, RawVariableValues } from "./types";

/**
 * How a variable is asked for in the variables form:
 * - simple kinds (string, id, int, float, scalar) → text field
 * - boolean → checkbox (non-null) or true/false dropdown (nullable)
 * - enum → dropdown (only when the schema is known)
 * - json → JSON editor (lists, input objects, JSON-like scalars)
 */
export type VariableKind = "string" | "id" | "int" | "float" | "boolean" | "enum" | "scalar" | "json";

export interface VariableSpec {
  name: string;
  /** Printed type, e.g. `[ID!]!` */
  type: string;
  kind: VariableKind;
  nonNull: boolean;
  hasDefault: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  /** Initial content of the JSON editor */
  template?: string;
  /** Extra help shown in the field's info tooltip */
  hint?: string;
  /** False when the type could not be resolved (no schema, custom named type) */
  typeKnown: boolean;
}

const BUILTIN_KINDS: Record<string, VariableKind> = {
  String: "string",
  ID: "id",
  Int: "int",
  Float: "float",
  Boolean: "boolean",
};

/** Custom scalars that carry arbitrary JSON values. */
const JSON_SCALAR = /^(json|jsonobject|jsonb|object|map|any)$/i;
/** Without a schema, named types following these conventions are most likely input objects. */
const LIKELY_INPUT_OBJECT = /(Input|Filter|Where|Exp)$/;

const MAX_TEMPLATE_DEPTH = 4;
const MAX_HINT_FIELDS = 25;

function exampleValue(type: GraphQLInputType, depth: number, seen: Set<string>): unknown {
  if (isNonNullType(type)) return exampleValue(type.ofType, depth, seen);
  if (isListType(type)) {
    const item = getNamedType(type);
    return isInputObjectType(item) ? [exampleValue(type.ofType, depth + 1, seen)] : [];
  }
  if (isEnumType(type)) return type.getValues()[0]?.name ?? "";
  if (isInputObjectType(type)) {
    if (depth >= MAX_TEMPLATE_DEPTH || seen.has(type.name)) return {};
    const nextSeen = new Set(seen).add(type.name);
    const result: Record<string, unknown> = {};
    // Only required fields are pre-filled: sending `null` for optional ones could overwrite data in mutations.
    for (const field of Object.values(type.getFields())) {
      if (isNonNullType(field.type) && field.defaultValue === undefined) {
        result[field.name] = exampleValue(field.type, depth + 1, nextSeen);
      }
    }
    return result;
  }
  if (isScalarType(type)) {
    switch (type.name) {
      case "Int":
      case "Float":
        return 0;
      case "Boolean":
        return false;
      default:
        return JSON_SCALAR.test(type.name) ? {} : "";
    }
  }
  return null;
}

function inputObjectHint(type: GraphQLInputType): string | undefined {
  const named = getNamedType(type);
  if (!isInputObjectType(named)) return undefined;
  const fields = Object.values(named.getFields());
  const lines = fields.slice(0, MAX_HINT_FIELDS).map((field) => `${field.name}: ${field.type.toString()}`);
  if (fields.length > MAX_HINT_FIELDS) lines.push(`…and ${fields.length - MAX_HINT_FIELDS} more`);
  return `${named.name} fields:\n${lines.join("\n")}`;
}

export function describeVariable(definition: VariableDefinitionNode, schema?: GraphQLSchema): VariableSpec {
  const name = definition.variable.name.value;
  const typeNode = definition.type;
  const nonNull = typeNode.kind === Kind.NON_NULL_TYPE;
  const inner = typeNode.kind === Kind.NON_NULL_TYPE ? typeNode.type : typeNode;
  const hasDefault = Boolean(definition.defaultValue);
  const defaultValue = definition.defaultValue ? valueFromASTUntyped(definition.defaultValue) : undefined;

  let schemaType: GraphQLInputType | undefined;
  if (schema) {
    try {
      const resolved = typeFromAST(schema, typeNode);
      if (resolved && isInputType(resolved)) schemaType = resolved;
    } catch {
      schemaType = undefined;
    }
  }

  const spec: VariableSpec = {
    name,
    type: print(typeNode),
    kind: "scalar",
    nonNull,
    hasDefault,
    defaultValue,
    typeKnown: true,
  };

  if (inner.kind === Kind.LIST_TYPE) {
    spec.kind = "json";
  } else if (BUILTIN_KINDS[inner.name.value]) {
    spec.kind = BUILTIN_KINDS[inner.name.value];
  } else if (schemaType) {
    const named = getNamedType(schemaType);
    if (isEnumType(named)) {
      spec.kind = "enum";
      spec.enumValues = named.getValues().map((value) => value.name);
    } else if (isInputObjectType(named)) {
      spec.kind = "json";
    } else {
      spec.kind = JSON_SCALAR.test(named.name) ? "json" : "scalar";
    }
  } else {
    // Unknown named type: could be an enum, a custom scalar or an input object.
    spec.typeKnown = false;
    spec.kind = LIKELY_INPUT_OBJECT.test(inner.name.value) || JSON_SCALAR.test(inner.name.value) ? "json" : "scalar";
  }

  if (spec.kind === "json") {
    const example = schemaType ? exampleValue(schemaType, 0, new Set()) : inner.kind === Kind.LIST_TYPE ? [] : {};
    spec.template = JSON.stringify(example, null, 2);
    spec.hint = schemaType ? inputObjectHint(schemaType) : undefined;
  }
  if (!spec.typeKnown) {
    spec.hint =
      spec.kind === "json"
        ? "Type unknown (schema unavailable): enter a JSON value."
        : "Type unknown (schema unavailable): text is sent as a string, JSON objects/arrays are parsed.";
  }
  return spec;
}

/** Checkbox for non-null booleans, everything else boolean-ish goes through a dropdown so "not set" is possible. */
export const usesCheckbox = (spec: VariableSpec) => spec.kind === "boolean" && spec.nonNull;

export const NOT_SET = "";

/** Free-text kinds, where `""` and blank strings are values: their "not set" is `null`. */
export const allowsEmptyString = (spec: VariableSpec) =>
  spec.kind === "string" || spec.kind === "id" || spec.kind === "scalar";

/** Whether a raw value can be shown by the field that `spec` renders (kinds may change once the schema loads). */
export function isCompatible(spec: VariableSpec, value: RawValue | undefined): value is RawValue {
  if (value === undefined) return false;
  if (usesCheckbox(spec)) return typeof value === "boolean";
  if (value === null) return allowsEmptyString(spec);
  if (typeof value !== "string") return false;
  if (spec.kind === "enum") return (value === NOT_SET && !spec.nonNull) || Boolean(spec.enumValues?.includes(value));
  if (spec.kind === "boolean") return [NOT_SET, "true", "false"].includes(value);
  return true;
}

/** The value shown in the form before the user types anything. */
export function initialRawValue(spec: VariableSpec, saved?: RawValue): RawValue {
  // The remembered value, unless the field can no longer show it (e.g. the variable's type changed).
  if (isCompatible(spec, saved)) return saved;
  if (usesCheckbox(spec)) return typeof spec.defaultValue === "boolean" ? spec.defaultValue : false;
  const unset = allowsEmptyString(spec) ? null : NOT_SET;
  // An explicit `= null` default: leave the field unset so the variable is omitted and the declared default applies.
  if (spec.defaultValue === null) return unset;
  if (spec.defaultValue !== undefined) {
    if (spec.kind === "json") return JSON.stringify(spec.defaultValue, null, 2);
    return String(spec.defaultValue);
  }
  if (spec.kind === "json") return spec.template ?? "";
  if (spec.kind === "enum" && spec.nonNull) return spec.enumValues?.[0] ?? NOT_SET;
  return unset;
}

export type ConversionResult = { value: unknown } | { omit: true } | { error: string };

/** Converts a raw form value into the JSON value sent in `variables`. */
export function convertRawValue(spec: VariableSpec, raw: RawValue | undefined): ConversionResult {
  if (typeof raw === "boolean") return { value: raw };
  const text = raw ?? "";
  const unset = allowsEmptyString(spec) ? raw === null || raw === undefined : text.trim() === "";
  if (unset) {
    if (spec.nonNull && !spec.hasDefault) return { error: "Required" };
    return { omit: true };
  }

  switch (spec.kind) {
    case "int":
      if (!/^-?\d+$/.test(text.trim())) return { error: "Must be an integer" };
      return { value: Number(text.trim()) };
    case "float": {
      const value = Number(text.trim());
      if (!Number.isFinite(value)) return { error: "Must be a number" };
      return { value };
    }
    case "boolean":
      return { value: text === "true" };
    case "json":
      try {
        return { value: JSON.parse(text) };
      } catch (error) {
        return { error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}` };
      }
    case "scalar":
      if (!spec.typeKnown && /^\s*[[{]/.test(text)) {
        try {
          return { value: JSON.parse(text) };
        } catch {
          return { value: text };
        }
      }
      return { value: text };
    default:
      return { value: text };
  }
}

export function buildVariables(
  specs: VariableSpec[],
  raw: RawVariableValues,
): { variables: Record<string, unknown>; errors: Record<string, string> } {
  const variables: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const spec of specs) {
    const result = convertRawValue(spec, raw[spec.name]);
    if ("error" in result) errors[spec.name] = result.error;
    else if ("value" in result) variables[spec.name] = result.value;
  }
  return { variables, errors };
}

/** Pretty-prints a JSON string, returning it unchanged when it does not parse. */
export function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
