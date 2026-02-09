import { InputField, OpenAPIObject } from "./types";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function resolveRef(
  openapi: OpenAPIObject,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const ref = schema.$ref;
  if (typeof ref !== "string") {
    return schema;
  }

  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (!match) {
    return schema;
  }

  const name = match[1];
  const resolved = openapi.components?.schemas?.[name];
  const resolvedRecord = asRecord(resolved);
  if (!resolvedRecord) {
    return schema;
  }
  return resolveRef(openapi, resolvedRecord);
}

function getInputSchema(
  openapi: OpenAPIObject,
): Record<string, unknown> | undefined {
  const paths = asRecord(openapi.paths);
  if (!paths) {
    return undefined;
  }

  for (const pathItem of Object.values(paths)) {
    const pathRecord = asRecord(pathItem);
    const post = asRecord(pathRecord?.post);
    const requestBody = asRecord(post?.requestBody);
    const content = asRecord(requestBody?.content);
    const appJson = asRecord(content?.["application/json"]);
    const schema = asRecord(appJson?.schema);
    if (schema) {
      return resolveRef(openapi, schema);
    }
  }
  return undefined;
}

function looksLikeImageField(key: string, schema: Record<string, unknown>) {
  const normalized = key.toLowerCase();
  const description = String(schema.description || "").toLowerCase();
  const title = String(schema.title || "").toLowerCase();

  const explicitImageInputNames = [
    "image",
    "image_url",
    "init_image",
    "input_image",
    "reference_image",
    "mask_image",
    "control_image",
    "first_frame_image",
    "last_frame_image",
    "photo",
    "photo_url",
  ];
  const explicitNonImageNames = [
    "image_size",
    "image_format",
    "num_images",
    "output_image_format",
    "image_quality",
    "image_count",
  ];

  if (explicitNonImageNames.includes(normalized)) {
    return false;
  }

  if (
    explicitImageInputNames.includes(normalized) ||
    normalized.endsWith("_image") ||
    normalized.endsWith("_image_url") ||
    normalized.endsWith("_photo") ||
    normalized.endsWith("_photo_url")
  ) {
    return true;
  }

  const hasInputHints =
    description.includes("input image") ||
    description.includes("source image") ||
    description.includes("image url") ||
    title.includes("input image") ||
    title.includes("source image") ||
    title.includes("image url");

  return (
    hasInputHints ||
    (normalized.includes("image") && !normalized.includes("size")) ||
    normalized.includes("photo")
  );
}

export function extractInputFields(openapi: OpenAPIObject) {
  const inputSchema = getInputSchema(openapi);
  if (!inputSchema) {
    return [] as InputField[];
  }

  const properties = asRecord(inputSchema.properties) || {};
  const requiredSet = new Set(
    Array.isArray(inputSchema.required)
      ? (inputSchema.required as string[])
      : [],
  );

  const fields: InputField[] = [];

  for (const [key, rawSchema] of Object.entries(properties)) {
    const propertySchema = resolveRef(openapi, asRecord(rawSchema) || {});
    const type = propertySchema.type;
    const enumValues = Array.isArray(propertySchema.enum)
      ? propertySchema.enum.filter(
          (value): value is string => typeof value === "string",
        )
      : undefined;

    if (enumValues && enumValues.length > 0) {
      fields.push({
        key,
        label: key,
        required: requiredSet.has(key),
        description:
          typeof propertySchema.description === "string"
            ? propertySchema.description
            : undefined,
        kind: "enum",
        enumValues,
        defaultValue:
          typeof propertySchema.default === "string"
            ? propertySchema.default
            : enumValues[0],
      });
      continue;
    }

    if (type === "string") {
      fields.push({
        key,
        label: key,
        required: requiredSet.has(key),
        description:
          typeof propertySchema.description === "string"
            ? propertySchema.description
            : undefined,
        kind: looksLikeImageField(key, propertySchema) ? "image" : "text",
        defaultValue:
          typeof propertySchema.default === "string"
            ? propertySchema.default
            : undefined,
      });
      continue;
    }

    if (type === "number" || type === "integer") {
      fields.push({
        key,
        label: key,
        required: requiredSet.has(key),
        description:
          typeof propertySchema.description === "string"
            ? propertySchema.description
            : undefined,
        kind: "number",
        defaultValue:
          typeof propertySchema.default === "number"
            ? propertySchema.default
            : undefined,
      });
      continue;
    }

    if (type === "boolean") {
      fields.push({
        key,
        label: key,
        required: requiredSet.has(key),
        description:
          typeof propertySchema.description === "string"
            ? propertySchema.description
            : undefined,
        kind: "boolean",
        defaultValue:
          typeof propertySchema.default === "boolean"
            ? propertySchema.default
            : false,
      });
      continue;
    }

    if (type === "array") {
      const items = asRecord(propertySchema.items) || {};
      const imageArray =
        looksLikeImageField(key, propertySchema) ||
        looksLikeImageField(`${key}_item`, items);
      if (imageArray) {
        fields.push({
          key,
          label: key,
          required: requiredSet.has(key),
          description:
            typeof propertySchema.description === "string"
              ? propertySchema.description
              : undefined,
          kind: "image-array",
        });
      }
    }
  }

  return fields;
}
