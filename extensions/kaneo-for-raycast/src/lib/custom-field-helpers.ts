import type { CustomFieldDefinition, CustomFieldValue } from "../types";
import { formatShortDate } from "./task-helpers";

/** taskId -> (fieldId -> value) */
export function groupCustomFieldValuesByTask(values: CustomFieldValue[]): Map<string, Map<string, unknown>> {
  const byTask = new Map<string, Map<string, unknown>>();
  for (const v of values) {
    if (!byTask.has(v.taskId)) byTask.set(v.taskId, new Map());
    byTask.get(v.taskId)!.set(v.fieldId, v.value);
  }
  return byTask;
}

export function sortCustomFields(fields: CustomFieldDefinition[]): CustomFieldDefinition[] {
  return [...fields].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function formatCustomFieldValue(field: CustomFieldDefinition, raw: unknown): string | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;

  switch (field.type) {
    case "checkbox":
      return raw === true || raw === "true" ? "Yes" : "No";
    case "date": {
      const date = new Date(String(raw));
      return Number.isNaN(date.getTime()) ? String(raw) : formatShortDate(date.toISOString());
    }
    case "multiselect": {
      const parsed = parseMaybeJson(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.length ? list.join(", ") : undefined;
    }
    default:
      return Array.isArray(raw) ? raw.join(", ") : String(raw);
  }
}
