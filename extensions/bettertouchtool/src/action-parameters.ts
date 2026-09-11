import type { ActionDefinition, ActionParamDoc } from "bettertouchtool/catalog";

export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;
export type ParameterKind = "boolean" | "json" | "number" | "raw-json" | "text";

export interface ParameterField {
  definition: ActionParamDoc;
  initialValue: unknown;
  kind: ParameterKind;
}

export function getParameterFields(actionDefinition: ActionDefinition): ParameterField[] {
  const parameters = new Map<string, ActionParamDoc>();
  for (const parameter of actionDefinition.params) {
    if (parameter.key !== "BTTPredefinedActionType" && !parameters.has(parameter.key)) {
      parameters.set(parameter.key, parameter);
    }
  }

  return [...parameters.values()].map((definition) => {
    const initialValue = actionDefinition.example?.[definition.key];
    return { definition, initialValue, kind: inferParameterKind(definition, initialValue) };
  });
}

export function inferParameterKind(definition: ActionParamDoc, initialValue: unknown): ParameterKind {
  if (typeof initialValue === "boolean" || /boolean/i.test(definition.description)) return "boolean";
  if (definition.children?.length || (initialValue !== null && typeof initialValue === "object")) return "json";
  if (typeof initialValue === "number" || /\b(number|seconds|amount|duration)\b/i.test(definition.description)) {
    return "number";
  }
  if (typeof initialValue === "string") return "text";
  return "raw-json";
}

export function formatInitialValue(value: unknown, kind: ParameterKind): string {
  if (value === undefined || value === null) return "";
  if (kind === "json" || kind === "raw-json") return JSON.stringify(value, null, 2);
  return String(value);
}

export function parseFormValue(value: FormValue | undefined, field: ParameterField): unknown {
  if (field.kind === "boolean") {
    return field.initialValue === undefined && value === false ? undefined : Boolean(value);
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  if (field.kind === "json" || field.kind === "raw-json") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${field.definition.key} must be a valid JSON value`);
    }
  }
  if (field.kind === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field.definition.key} must be a valid number`);
    return number;
  }
  return value;
}
