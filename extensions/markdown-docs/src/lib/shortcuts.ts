import type { ParsedShortcut } from "../types";

export function parseShortcutQuery(query: string): ParsedShortcut | null {
  const colonIndex = query.indexOf(":");
  if (colonIndex === -1) return null;

  const prefix = query.substring(0, colonIndex).trim();
  const searchTerm = query.substring(colonIndex + 1).trim();

  if (!prefix) return null;

  return { prefix, searchTerm };
}
