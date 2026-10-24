import { Entry } from "./types";

export function getEntryId(entry: Entry): string {
  return [entry.name, entry.path, entry.type].map((part) => `${part.length}:${part}`).join("|");
}

export function getSelectedEntryId(entries: Entry[]): string | undefined {
  return entries[0] ? getEntryId(entries[0]) : undefined;
}
