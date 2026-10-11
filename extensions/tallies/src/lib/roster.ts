import { parseAttendanceMarkdown } from "./markdown.ts";
import type { Entry, Store, Template } from "./types.ts";
import { normalizeTime } from "./time.ts";

export function templateName(template: Template): string {
  return template.heading?.trim() || template.label;
}
export function templateEntries(store: Store, templateId: string): Entry[] {
  return store.entries.filter((entry) => entry.templateId === templateId);
}
export function defaultTimeIn(store: Store, templateId: string): string {
  // Old templates inherit the previously shared time until their first explicit setting.
  return store.templates.find((template) => template.id === templateId)?.defaultTimeIn ?? store.sharedTimeIn;
}
export function replaceTemplateEntries(store: Store, templateId: string, entries: Entry[]): Store {
  if (entries.some((entry) => entry.templateId !== templateId)) throw new Error("Entry belongs to another template.");
  return { ...store, entries: [...store.entries.filter((entry) => entry.templateId !== templateId), ...entries] };
}
export function deleteEntry(store: Store, entryId: string): Store {
  return { ...store, entries: store.entries.filter((entry) => entry.id !== entryId) };
}
export function setTemplateTimeIn(store: Store, templateId: string, value: string): Store {
  const time = normalizeTime(value);
  return {
    ...store,
    templates: store.templates.map((template) =>
      template.id === templateId ? { ...template, defaultTimeIn: time } : template,
    ),
    entries: store.entries.map((entry) =>
      entry.templateId === templateId && entry.status !== "no_show" ? { ...entry, timeIn: time } : entry,
    ),
  };
}

/** Validate the complete document before replacing any template text or entries. */
export function saveAttendanceMarkdown(store: Store, templateId: string, markdown: string): Store {
  const template = store.templates.find((item) => item.id === templateId);
  if (!template) throw new Error("Select a template first.");
  const parsed = parseAttendanceMarkdown(markdown, template, templateEntries(store, templateId));
  return {
    ...replaceTemplateEntries(store, templateId, parsed.entries),
    templates: store.templates.map((item) => (item.id === templateId ? parsed.template : item)),
  };
}
