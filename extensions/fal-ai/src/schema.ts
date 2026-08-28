import { JsonSchema, OpenApiDocument, SchemaField } from "./types";

const PRIORITY_FIELDS = [
  "prompt",
  "image_url",
  "video_url",
  "audio_url",
  "seed",
  "num_images",
  "image_size",
  "aspect_ratio",
];

export function extractInputFields(openapi?: OpenApiDocument): SchemaField[] {
  const schema = extractInputSchema(openapi);
  if (!schema?.properties) return defaultFields();

  const fields = Object.entries(schema.properties).map(
    ([name, fieldSchema]) => {
      const resolved = normalizeSchema(resolveSchema(fieldSchema, openapi));
      const enumOptions = getEnumOptions(resolved);
      const kind = getFieldKind(resolved, enumOptions);

      return {
        name,
        title: humanize(name),
        description: resolved.description,
        required: Boolean(schema.required?.includes(name)),
        schema: resolved,
        kind,
        enumOptions,
        defaultValue: resolved.default,
      } satisfies SchemaField;
    },
  );

  return fields
    .sort((a, b) => fieldRank(a) - fieldRank(b) || a.name.localeCompare(b.name))
    .slice(0, 28);
}

export function parseFormValues(
  fields: SchemaField[],
  values: Record<string, unknown>,
) {
  const input: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.name];
    const parsed = parseFieldValue(field, value);
    if (parsed !== undefined) input[field.name] = parsed;
  }

  const rawOverrides = String(values.rawJson ?? "").trim();
  if (rawOverrides) {
    const parsed = JSON.parse(rawOverrides);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Raw JSON overrides must be a JSON object.");
    }
    Object.assign(input, parsed);
  }

  const missingRequired = fields.find((field) => {
    const value = input[field.name];
    return (
      field.required && (value === undefined || value === null || value === "")
    );
  });
  if (missingRequired) {
    throw new Error(`${missingRequired.title} is required.`);
  }

  return input;
}

export function getPrompt(input: Record<string, unknown>) {
  const prompt = input.prompt ?? input.text ?? input.query;
  return typeof prompt === "string" ? prompt : undefined;
}

export function splitFields(fields: SchemaField[]) {
  const required = fields.filter((field) => field.required);
  const optional = fields.filter(
    (field) => !field.required && field.kind !== "json",
  );
  const advanced = fields.filter(
    (field) => !field.required && field.kind === "json",
  );

  return { required, optional, advanced };
}

export function defaultFields(): SchemaField[] {
  return [
    {
      name: "prompt",
      title: "Prompt",
      description: "Text prompt for the model.",
      required: true,
      schema: { type: "string" },
      kind: "string",
    },
  ];
}

function extractInputSchema(openapi?: OpenApiDocument): JsonSchema | undefined {
  const operations = Object.values(openapi?.paths ?? {}).flatMap((pathItem) =>
    Object.values(pathItem),
  );
  for (const operation of operations) {
    const schema = operation.requestBody?.content?.["application/json"]?.schema;
    const resolved = normalizeSchema(resolveSchema(schema, openapi));
    if (resolved?.properties) return resolved;
  }
  return undefined;
}

function resolveSchema(
  schema: JsonSchema | undefined,
  openapi?: OpenApiDocument,
): JsonSchema | undefined {
  if (!schema) return undefined;

  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    return name
      ? resolveSchema(openapi?.components?.schemas?.[name], openapi)
      : schema;
  }

  if (schema.allOf?.length) {
    return schema.allOf
      .map((entry) => resolveSchema(entry, openapi))
      .reduce<JsonSchema>(
        (merged, entry) => ({
          ...merged,
          ...entry,
          properties: {
            ...(merged.properties ?? {}),
            ...(entry?.properties ?? {}),
          },
          required: [...(merged.required ?? []), ...(entry?.required ?? [])],
        }),
        {},
      );
  }

  return schema;
}

function normalizeSchema(schema: JsonSchema | undefined): JsonSchema {
  if (!schema) return {};

  const variants = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].filter(
    (variant) => variant.type !== "null",
  );
  if (variants.length === 1) {
    return { ...schema, ...variants[0], anyOf: undefined, oneOf: undefined };
  }

  return schema;
}

function getEnumOptions(schema: JsonSchema) {
  const values =
    schema.enum ??
    (schema.const !== undefined ? [schema.const] : undefined) ??
    [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]
      ?.map((variant) => variant.const)
      .filter((value) => value !== undefined);
  return values?.map((rawValue, index) => ({
    title: formatEnumTitle(rawValue),
    value: String(index),
    rawValue,
  }));
}

function getFieldKind(
  schema: JsonSchema,
  enumOptions?: SchemaField["enumOptions"],
): SchemaField["kind"] {
  if (enumOptions?.length) return "enum";
  const type = Array.isArray(schema.type)
    ? schema.type.find((entry) => entry !== "null")
    : schema.type;
  if (type === "boolean") return "boolean";
  if (type === "number" || type === "integer") return "number";
  if (type === "string") return "string";
  return "json";
}

function parseFieldValue(field: SchemaField, value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  if (field.kind === "enum") {
    return field.enumOptions?.find((option) => option.value === value)
      ?.rawValue;
  }
  if (field.kind === "boolean") return Boolean(value);
  if (field.kind === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (field.kind === "json") {
    return typeof value === "string" && value.trim()
      ? JSON.parse(value)
      : undefined;
  }

  return value;
}

function formatEnumTitle(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function humanize(name: string) {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bUrl\b/g, "URL");
}

function fieldRank(field: SchemaField) {
  const priority = PRIORITY_FIELDS.indexOf(field.name);
  if (priority >= 0) return priority;
  if (field.required) return 50;
  if (field.kind === "json") return 200;
  return 100;
}
