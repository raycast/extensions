import { Model, OptionSchema } from "../types";

export type FieldKind = "select" | "boolean" | "number" | "file" | "text" | "textarea";

export type Field = {
  name: string;
  title: string;
  kind: FieldKind;
  schema: OptionSchema;
  enums: string[];
  required: boolean;
  info?: string;
};

const LONG_TEXT = /prompt|text|description|instruction|caption/i;

const titleCase = (name: string) => name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const kindOf = (schema: OptionSchema, name: string, enums: string[]): FieldKind => {
  if (enums.length) return "select";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.format === "uri") return "file";
  return LONG_TEXT.test(name) ? "textarea" : "text";
};

export const modelFields = (model?: Model | null): Field[] => {
  const schemas = model?.latest_version?.openapi_schema?.components?.schemas;
  const input = schemas?.Input;
  if (!input?.properties) return [];

  return Object.entries(input.properties)
    .sort(([, a], [, b]) => (a["x-order"] ?? 0) - (b["x-order"] ?? 0))
    .map(([name, schema]) => {
      // An allOf input keeps its enum in a sibling schema of the same name.
      const enums = schema.enum ?? (schema.allOf ? (schemas?.[name]?.enum ?? []) : []);
      const bounds = [
        schema.minimum === undefined ? "" : `min ${schema.minimum}`,
        schema.maximum === undefined ? "" : `max ${schema.maximum}`,
      ].filter(Boolean);

      return {
        name,
        title: schema.title ?? titleCase(name),
        kind: kindOf(schema, name, enums),
        schema,
        enums,
        required: input.required?.includes(name) ?? false,
        info: [schema.description, bounds.join(", ")].filter(Boolean).join(" · ") || undefined,
      };
    });
};
