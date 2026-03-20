import type { KubeApiResource } from "./kubectl";

export type KubeFieldType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "map"
  | "int-or-string"
  | "unknown";

export interface KubeFieldSchema {
  path: string[];
  key: string;
  label: string;
  type: KubeFieldType;
  required: boolean;
  description?: string;
  enumValues?: string[];
  format?: string;
  defaultValue?: unknown;
  warnings: string[];
  properties?: KubeFieldSchema[];
  itemSchema?: KubeFieldSchema;
  additionalProperties?: KubeFieldSchema;
}

export interface KubeResourceSchema {
  kind: string;
  apiVersion: string;
  root: KubeFieldSchema;
  warnings: string[];
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function joinPath(path: string[]): string {
  return path.join(".");
}

function mergeSchemas(base: JsonObject, overlay: JsonObject): JsonObject {
  const merged: JsonObject = { ...base, ...overlay };

  if (isObject(base.properties) || isObject(overlay.properties)) {
    merged.properties = {
      ...(isObject(base.properties) ? base.properties : {}),
      ...(isObject(overlay.properties) ? overlay.properties : {}),
    };
  }

  if (Array.isArray(base.required) || Array.isArray(overlay.required)) {
    merged.required = Array.from(
      new Set([
        ...(Array.isArray(base.required) ? base.required : []),
        ...(Array.isArray(overlay.required) ? overlay.required : []),
      ]),
    );
  }

  return merged;
}

function resolveRefs(
  schema: unknown,
  definitions: Record<string, unknown>,
  seen = new Set<string>(),
): JsonObject {
  if (!isObject(schema)) {
    return {};
  }

  if (typeof schema.$ref === "string") {
    const ref = schema.$ref.replace("#/definitions/", "");
    if (seen.has(ref)) {
      return {};
    }

    const nextSeen = new Set(seen);
    nextSeen.add(ref);

    const resolved = resolveRefs(definitions[ref], definitions, nextSeen);
    return mergeSchemas(
      resolved,
      Object.fromEntries(
        Object.entries(schema).filter(([key]) => key !== "$ref"),
      ),
    );
  }

  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce<JsonObject>(
      (accumulator, current) =>
        mergeSchemas(
          accumulator,
          resolveRefs(current, definitions, new Set(seen)),
        ),
      Object.fromEntries(
        Object.entries(schema).filter(([key]) => key !== "allOf"),
      ),
    );
  }

  return schema;
}

function isIntOrStringSchema(schema: JsonObject): boolean {
  if (schema["x-kubernetes-int-or-string"] === true) {
    return true;
  }

  if (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2) {
    return false;
  }

  const kinds = schema.anyOf
    .map((entry) => (isObject(entry) ? entry.type : undefined))
    .filter((type): type is string => typeof type === "string")
    .sort();

  return kinds.join(",") === "integer,string";
}

function normalizeNode(
  key: string,
  schemaInput: unknown,
  path: string[],
  required: boolean,
  definitions: Record<string, unknown>,
): KubeFieldSchema {
  const schema = resolveRefs(schemaInput, definitions);
  const warnings: string[] = [];
  const schemaPath = [...path, key];

  if (Array.isArray(schema["x-kubernetes-validations"])) {
    warnings.push(
      `${joinPath(schemaPath)} uses Kubernetes validation rules that are warning-only in this UI.`,
    );
  }

  if (Array.isArray(schema.oneOf)) {
    warnings.push(
      `${joinPath(schemaPath)} uses oneOf; this UI will render a best-effort editor.`,
    );
  }

  if (Array.isArray(schema.anyOf) && !isIntOrStringSchema(schema)) {
    warnings.push(
      `${joinPath(schemaPath)} uses anyOf; this UI will render a best-effort editor.`,
    );
  }

  const node: KubeFieldSchema = {
    path: schemaPath,
    key,
    label: titleCase(key),
    type: "unknown",
    required,
    description:
      typeof schema.description === "string" ? schema.description : undefined,
    enumValues: Array.isArray(schema.enum)
      ? schema.enum.filter((item): item is string => typeof item === "string")
      : undefined,
    format: typeof schema.format === "string" ? schema.format : undefined,
    defaultValue: schema.default,
    warnings,
  };

  if (isIntOrStringSchema(schema)) {
    node.type = "int-or-string";
    return node;
  }

  const type =
    typeof schema.type === "string"
      ? schema.type
      : isObject(schema.properties) || isObject(schema.additionalProperties)
        ? "object"
        : undefined;

  switch (type) {
    case "string":
      node.type = "string";
      return node;
    case "integer":
      node.type = "integer";
      return node;
    case "number":
      node.type = "number";
      return node;
    case "boolean":
      node.type = "boolean";
      return node;
    case "array": {
      node.type = "array";
      node.itemSchema = normalizeNode(
        "item",
        schema.items,
        schemaPath,
        false,
        definitions,
      );
      return node;
    }
    case "object": {
      if (
        isObject(schema.additionalProperties) &&
        !isObject(schema.properties)
      ) {
        node.type = "map";
        node.additionalProperties = normalizeNode(
          "value",
          schema.additionalProperties,
          schemaPath,
          false,
          definitions,
        );
        return node;
      }

      node.type = "object";
      const requiredSet = new Set(
        Array.isArray(schema.required)
          ? schema.required.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
      );

      if (isObject(schema.properties)) {
        node.properties = Object.entries(schema.properties).map(
          ([childKey, child]) =>
            normalizeNode(
              childKey,
              child,
              schemaPath,
              requiredSet.has(childKey),
              definitions,
            ),
        );
      } else {
        node.properties = [];
      }

      if (isObject(schema.additionalProperties)) {
        node.additionalProperties = normalizeNode(
          "value",
          schema.additionalProperties,
          schemaPath,
          false,
          definitions,
        );
      }

      return node;
    }
    default:
      node.type = "unknown";
      if (!type) {
        warnings.push(
          `${joinPath(schemaPath)} has no explicit type; rendering is best-effort.`,
        );
      }
      return node;
  }
}

function collectWarnings(node: KubeFieldSchema): string[] {
  return [
    ...node.warnings,
    ...(node.properties ?? []).flatMap((child) => collectWarnings(child)),
    ...(node.itemSchema ? collectWarnings(node.itemSchema) : []),
    ...(node.additionalProperties
      ? collectWarnings(node.additionalProperties)
      : []),
  ];
}

function getApiVersionParts(apiVersion: string): {
  group: string;
  version: string;
} {
  const [maybeGroup, version] = apiVersion.includes("/")
    ? apiVersion.split("/", 2)
    : ["", apiVersion];
  return { group: maybeGroup, version };
}

export function normalizeOpenApiResourceSchema(
  openApiDocument: JsonObject,
  resource: KubeApiResource,
): KubeResourceSchema {
  const definitions = isObject(openApiDocument.definitions)
    ? (openApiDocument.definitions as Record<string, unknown>)
    : {};
  const { group, version } = getApiVersionParts(resource.apiVersion);

  const match = Object.values(definitions).find((definition) => {
    if (
      !isObject(definition) ||
      !Array.isArray(definition["x-kubernetes-group-version-kind"])
    ) {
      return false;
    }

    return definition["x-kubernetes-group-version-kind"].some((entry) => {
      if (!isObject(entry)) {
        return false;
      }

      return (
        entry.kind === resource.kind &&
        entry.version === version &&
        (entry.group ?? "") === group
      );
    });
  });

  if (!match) {
    throw new Error(
      `OpenAPI schema not found for ${resource.kind} (${resource.apiVersion})`,
    );
  }

  const root = normalizeNode(resource.kind, match, [], false, definitions);

  return {
    kind: resource.kind,
    apiVersion: resource.apiVersion,
    warnings: collectWarnings(root),
    root,
  };
}

export function normalizeCrdResourceSchema(
  crdSchema: JsonObject,
  resource: KubeApiResource,
): KubeResourceSchema {
  const root = normalizeNode(resource.kind, crdSchema, [], false, {});
  return {
    kind: resource.kind,
    apiVersion: resource.apiVersion,
    warnings: collectWarnings(root),
    root,
  };
}

export function getEditableRootFields(
  schema: KubeResourceSchema,
): KubeFieldSchema[] {
  return (schema.root.properties ?? []).filter(
    (field) =>
      !["apiVersion", "kind", "metadata", "status"].includes(field.key),
  );
}

export function getSchemaNodeAtPath(
  root: KubeFieldSchema,
  path: string[],
): KubeFieldSchema | undefined {
  let current: KubeFieldSchema | undefined = root;

  for (const segment of path) {
    if (!current) {
      return undefined;
    }

    if (segment === "item") {
      current = current.itemSchema;
      continue;
    }

    if (segment === "value") {
      current = current.additionalProperties;
      continue;
    }

    current = current.properties?.find((child) => child.key === segment);
  }

  return current;
}

export function isSimpleField(node: KubeFieldSchema): boolean {
  return ["string", "integer", "number", "boolean", "int-or-string"].includes(
    node.type,
  );
}

export function isShallowObject(node: KubeFieldSchema): boolean {
  return (
    node.type === "object" &&
    (node.properties?.length ?? 0) > 0 &&
    (node.properties ?? []).every((child) => isSimpleField(child))
  );
}

export function summarizeValue(value: unknown): string {
  if (value === undefined) {
    return "Not set";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value || "Empty string";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (isObject(value)) {
    const keys = Object.keys(value);
    return `${keys.length} field${keys.length === 1 ? "" : "s"}`;
  }

  return "Configured";
}

export function buildDefaultBodyState(schema: KubeFieldSchema): unknown {
  if (schema.defaultValue !== undefined) {
    return schema.defaultValue;
  }

  if (schema.type === "object") {
    const entries = (schema.properties ?? [])
      .map((child) => [child.key, buildDefaultBodyState(child)] as const)
      .filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  return undefined;
}

export function toEditableValue(
  schema: KubeFieldSchema,
  value: unknown,
): unknown {
  if (value === undefined) {
    return undefined;
  }

  switch (schema.type) {
    case "string":
      return typeof value === "string" ? value : String(value);
    case "integer":
    case "number":
      return typeof value === "number" ? String(value) : String(value);
    case "boolean":
      return typeof value === "boolean" ? String(value) : String(value);
    case "int-or-string":
      return {
        mode: typeof value === "number" ? "number" : "string",
        value: String(value),
      };
    case "array":
      return Array.isArray(value)
        ? value.map((item) =>
            schema.itemSchema ? toEditableValue(schema.itemSchema, item) : item,
          )
        : [];
    case "object": {
      if (!isObject(value)) {
        return {};
      }

      const result: Record<string, unknown> = {};
      for (const child of schema.properties ?? []) {
        const editableValue = toEditableValue(child, value[child.key]);
        if (editableValue !== undefined) {
          result[child.key] = editableValue;
        }
      }

      return result;
    }
    case "map": {
      if (!isObject(value)) {
        return {};
      }

      const result: Record<string, unknown> = {};
      for (const [key, childValue] of Object.entries(value)) {
        const editableValue = schema.additionalProperties
          ? toEditableValue(schema.additionalProperties, childValue)
          : childValue;
        if (editableValue !== undefined) {
          result[key] = editableValue;
        }
      }

      return result;
    }
    default:
      return value;
  }
}

function emptyObjectToUndefined(
  value: Record<string, unknown>,
): Record<string, unknown> | undefined {
  return Object.keys(value).length > 0 ? value : undefined;
}

export function materializeFieldValue(
  schema: KubeFieldSchema,
  value: unknown,
): unknown {
  switch (schema.type) {
    case "string": {
      if (value === undefined || value === "") {
        return undefined;
      }

      return String(value);
    }
    case "integer": {
      if (value === undefined || value === "") {
        return undefined;
      }

      const parsed = Number(value);
      if (!Number.isInteger(parsed)) {
        throw new Error(`${schema.label} must be an integer`);
      }

      return parsed;
    }
    case "number": {
      if (value === undefined || value === "") {
        return undefined;
      }

      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new Error(`${schema.label} must be a number`);
      }

      return parsed;
    }
    case "boolean": {
      if (value === undefined || value === "") {
        return undefined;
      }

      if (value === true || value === "true") {
        return true;
      }

      if (value === false || value === "false") {
        return false;
      }

      throw new Error(`${schema.label} must be true or false`);
    }
    case "int-or-string": {
      if (!isObject(value)) {
        return undefined;
      }

      const rawMode = value.mode;
      const rawValue = value.value;
      if (rawValue === undefined || rawValue === "") {
        return undefined;
      }

      if (rawMode === "number") {
        const parsed = Number(rawValue);
        if (!Number.isInteger(parsed)) {
          throw new Error(`${schema.label} must be an integer`);
        }

        return parsed;
      }

      return String(rawValue);
    }
    case "array": {
      if (!Array.isArray(value) || !schema.itemSchema) {
        return undefined;
      }

      const items = value
        .map((item) => materializeFieldValue(schema.itemSchema!, item))
        .filter((item) => item !== undefined);

      return items.length > 0 ? items : undefined;
    }
    case "object": {
      if (!isObject(value)) {
        return undefined;
      }

      const result: Record<string, unknown> = {};
      for (const child of schema.properties ?? []) {
        const childValue = materializeFieldValue(child, value[child.key]);
        if (childValue !== undefined) {
          result[child.key] = childValue;
        } else if (child.required) {
          throw new Error(`${child.label} is required`);
        }
      }

      return emptyObjectToUndefined(result);
    }
    case "map": {
      if (!isObject(value) || !schema.additionalProperties) {
        return undefined;
      }

      const result: Record<string, unknown> = {};
      for (const [key, childValue] of Object.entries(value)) {
        const materialized = materializeFieldValue(
          schema.additionalProperties,
          childValue,
        );
        if (materialized !== undefined) {
          result[key] = materialized;
        }
      }

      return emptyObjectToUndefined(result);
    }
    default:
      return value;
  }
}
