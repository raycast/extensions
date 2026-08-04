// The entry `type` enum vocabulary, shared by every surface that shows
// or picks a type. Mirrors the server's entries.type CHECK constraint
// (abbreviation | term | word | name) and the web's EntryForm.vue TYPES.
// Single source of truth: the type dropdowns (Quick Add Entry, the entry
// editor) render ENTRY_TYPES, and read-only surfaces (the Search detail
// pane's Type row, the AI prompt composer) resolve labels through
// entryTypeLabel. Before this module the four values lived in three
// places (two TYPES arrays + a TYPE_LABELS map) that would drift if the
// server ever added a type.

export const ENTRY_TYPES = [
  { value: "term", label: "Term" },
  { value: "abbreviation", label: "Abbreviation" },
  { value: "word", label: "Word" },
  { value: "name", label: "Name" },
];

// Display label for a type value. Falls back to the raw value so an
// unknown / future enum value renders as itself rather than blank.
export function entryTypeLabel(type: string): string {
  return ENTRY_TYPES.find((t) => t.value === type)?.label ?? type;
}
