// Shared helpers for the single comma-separated Tags field used by
// Quick Add Entry and the entry editor. Both forms send every name as
// `tag_names`; the server resolves each one case-insensitively against
// the list's existing tags (reusing that tag's id) and creates the rest
// (list-repo migration 20260608000000 for create, 20260725000000 for
// update). Centralised so the parse rules and the user-facing info copy
// can't drift between the two forms.

import type { Tag } from "./api";

// Split a comma-separated tags input into clean names: trim each
// segment, drop empties ("foo, , bar" resolves to ["foo", "bar"]).
// `?? ""` defends against useForm leaving the field undefined.
export function parseTagNames(input: string | null | undefined): string[] {
  return (input ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// The ⓘ info tooltip for the Tags field. When the list already has
// tags, surfaces their names for discoverability (the closest stand-in
// for the removed TagPicker's browsable chip list). Tolerates undefined
// per the Array.isArray guard convention (CLAUDE.md → Common Pitfalls:
// a cached pre-migration /api/v1/lists row can briefly lack `tags`).
export function tagsFieldInfo(tags: Tag[] | null | undefined): string {
  if (Array.isArray(tags) && tags.length > 0) {
    const names = tags.map((t) => t.name).join(", ");
    return `Comma-separated. Existing tags on this list: ${names}. Type any name; existing tags are reused (case-insensitive) and new ones are created.`;
  }
  return "Comma-separated tag names. Any new names are created on this list.";
}
