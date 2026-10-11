import { normalizeTime } from "./time.ts";
import type { Entry, Store, Template } from "./types.ts";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid backup object.");
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("A backup field is missing or invalid.");
  return value;
}
function optional(value: unknown): string | undefined {
  return value === undefined ? undefined : string(value);
}
function unique(ids: string[]) {
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new Error("Backup contains empty or duplicate IDs.");
}
export function exportBackup(store: Store): string {
  return JSON.stringify({ format: "tallies-backup", version: 1, data: store }, null, 2);
}
/** Validate the entire backup before the caller replaces any local data. */
export function importBackup(raw: string): Store {
  const backup = object(JSON.parse(raw));
  if ((backup.format !== "tallies-backup" && backup.format !== "tally-backup") || backup.version !== 1)
    throw new Error("Choose a supported Tallies backup (version 1).");
  const data = object(backup.data);
  if (data.version !== 1 || !Array.isArray(data.templates) || !data.templates.length || !Array.isArray(data.entries))
    throw new Error("Backup must contain templates and entries.");
  const templates: Template[] = data.templates.map((value) => {
    const t = object(value);
    return {
      id: string(t.id),
      label: string(t.label),
      body: string(t.body),
      heading: optional(t.heading),
      notes: optional(t.notes),
      defaultTimeIn: t.defaultTimeIn === undefined ? undefined : normalizeTime(string(t.defaultTimeIn)),
    };
  });
  unique(templates.map((t) => t.id));
  const ids = new Set(templates.map((t) => t.id));
  const selectedTemplateId = string(data.selectedTemplateId);
  if (!ids.has(selectedTemplateId)) throw new Error("The selected template is missing.");
  const entries: Entry[] = data.entries.map((value) => {
    const e = object(value);
    if (e.status !== "present" && e.status !== "clocked_out" && e.status !== "no_show")
      throw new Error("Invalid attendance status.");
    const templateId = string(e.templateId);
    if (!ids.has(templateId)) throw new Error("An entry refers to a missing template.");
    const timeOut = normalizeTime(string(e.timeOut));
    if (e.status === "clocked_out" && !timeOut) throw new Error("A clocked-out entry needs a time out.");
    return {
      id: string(e.id),
      login: string(e.login),
      name: string(e.name),
      timeIn: normalizeTime(string(e.timeIn)),
      timeOut,
      status: e.status,
      templateId,
      templateBody: string(e.templateBody),
      templateHeading: optional(e.templateHeading),
      templateNotes: optional(e.templateNotes),
    };
  });
  unique(entries.map((e) => e.id));
  return { version: 1, templates, entries, selectedTemplateId, sharedTimeIn: normalizeTime(string(data.sharedTimeIn)) };
}
