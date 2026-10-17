import type { PondSave } from "./api/schemas";

export function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function saveTitle(save: PondSave): string {
  return (
    (save.title || save.description || "").replace(/\s+/g, " ").trim() ||
    save.author ||
    hostname(save.url) ||
    "Untitled Save"
  );
}

export function saveCaption(save: PondSave): string {
  return escapeMarkdown(save.description || save.title || save.url);
}

export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!>|~<]/g, "\\$&");
}

export function savedDate(value: PondSave["savedAt"]): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
