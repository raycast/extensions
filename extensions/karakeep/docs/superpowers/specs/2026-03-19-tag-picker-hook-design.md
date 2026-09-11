# Tag Picker Hook & Note Edit Design

**Date:** 2026-03-19
**Status:** Approved

## Problem

`createBookmark.tsx` and `createNote.tsx` contain identical tag-picking logic: five state variables, a ref, three handler functions, and the submit-time tag attachment loop. This logic will need to be added to `BookmarkEdit.tsx` as well (a P1 TODO item). Without extraction, the same code would exist in three places with no single source of truth.

Additionally, `BookmarkEdit.tsx` currently handles both link and text bookmarks despite their different field requirements. A dedicated `NoteEdit.tsx` is needed for consistency with the create forms and to allow each edit form to show the correct fields without conditionals.

## Goals

1. Extract all tag-picking state and logic into a single reusable `useTagPicker` hook, including full attach and detach support for edit forms.
2. Add tag fields to `BookmarkEdit`.
3. Create `NoteEdit` with the appropriate fields for text bookmarks.
4. Route edit actions to the correct form based on `bookmark.content.type`.

## Out of Scope

- List field on edit forms (see List Membership section below)
- AI tag suggestion feature (separate TODO item)
- Any changes to the create forms beyond the hook refactor

---

## List Membership

The `Bookmark` object returned by the API does not include list membership — the relationship is list → bookmarks only. There is no way to know which list(s) a bookmark belongs to without fetching each list separately.

**Consequence:** The List dropdown is omitted from both `BookmarkEdit` and `NoteEdit`. It remains on the create forms (`createBookmark`, `createNote`) where it correctly sets membership at creation time with nothing to remove.

List membership on edit forms is deferred pending API support for reading list membership from a bookmark object.

**README note needed:** List membership can only be managed from the Lists view (add/remove bookmarks within a list context), not from the Edit Bookmark or Edit Note forms.

---

## New Files

### `src/hooks/useTagPicker.ts`

A custom hook that owns all tag-picking state and logic.

**Interface:**

```ts
interface UseTagPickerOptions {
  tags: Tag[]; // all existing tags from useGetAllTags
  initialTagIds?: string[]; // for edit forms: seeds selectedTagIds on mount
}

interface UseTagPickerReturn {
  selectedTagIds: string[];
  newTagItems: Array<{ id: string; name: string }>;
  pendingInput: string;
  onTagIdsChange: (value: string[]) => void;
  onPendingInputChange: (text: string) => void;
  commitPendingTag: () => void; // call on onBlur of the Add New Tag field
  addedTagIds: string[]; // selectedTagIds minus initialTagIds — attach these on edit submit
  removedTagIds: string[]; // initialTagIds minus selectedTagIds — detach these on edit submit
  buildTagsToAttach: () => Array<{ tagId?: string; tagName?: string; attachedBy: "human" }>;
  buildTagsToDetach: () => Array<{ tagId: string }>; // maps removedTagIds to detach payload
  reset: () => void; // clears all state; ONLY call from create forms after successful submit
}
```

Note: `setPendingInput` is not exposed — `onPendingInputChange` is the correct public API and handles comma-splitting. `pendingInput` is read-only from the consumer's perspective.

**Internals:**

- Holds `selectedTagIds`, `newTagItems`, `pendingInput` as state
- Holds `selectedTagIdsRef` as a ref (prevents stale closure in `onTagIdsChange`)
- `commitNewTag(name)` — deduplicates against `tags` and `newTagItems`, adds a `new:`-prefixed entry; called internally by `onPendingInputChange` and `commitPendingTag`
- `onPendingInputChange` — splits on comma, calls `commitNewTag` for all but the last part
- `onTagIdsChange` — filters out `TAG_PICKER_NOOP_VALUE`, syncs ref, prunes removed `newTagItems`
- `addedTagIds` — derived: `selectedTagIds.filter(id => !initialTagIds?.includes(id))`
- `removedTagIds` — derived: `(initialTagIds ?? []).filter(id => !selectedTagIds.includes(id))`
- `buildTagsToAttach` — delegates to `buildTagsToAttach(selectedTagIds, newTagItems)` from `src/utils/tags.ts`
- `buildTagsToDetach` — maps `removedTagIds` to `Array<{ tagId: string }>` (only existing tag IDs can be removed; `new:`-prefixed IDs are never in `initialTagIds`)
- `reset` — resets `selectedTagIds` to `[]`, `newTagItems` to `[]`, `pendingInput` to `""`, ref to `[]`. **Only call from create forms.**

Constant `TAG_PICKER_NOOP_VALUE` lives in this file and is exported. `NEW_TAG_PREFIX` is defined in and imported from `src/utils/tags.ts` (its canonical location, avoiding a circular import).

**`initialTagIds` behavior:** Seeds `selectedTagIds` on mount. `addedTagIds` and `removedTagIds` are derived from the diff against `initialTagIds`. Only existing tag IDs (non-`new:`-prefixed) can appear in `removedTagIds`.

**`reset()` scope:** Only call from create forms (`createBookmark`, `createNote`) after a successful submit. Edit forms navigate away via `pop()` and must not call `reset()`.

### `src/utils/tags.ts`

Exports a pure utility function used internally by the hook:

```ts
export const NEW_TAG_PREFIX = "new:";

export function buildTagsToAttach(
  selectedTagIds: string[],
  newTagItems: Array<{ id: string; name: string }>,
): Array<{ tagId?: string; tagName?: string; attachedBy: "human" }>
```

Maps each ID: if it starts with `NEW_TAG_PREFIX`, looks up the name in `newTagItems` and produces `{ tagName, attachedBy: "human" }`; otherwise produces `{ tagId: id, attachedBy: "human" }`.

The hook's no-arg `buildTagsToAttach()` delegates to this function. This file is not called directly by form components.

### `src/components/NoteEdit.tsx`

Edit form for text bookmarks (`bookmark.content.type === "text"`).

**Fields:**

- Content (TextArea, required, max 2500 chars with validation error) — pre-populated from `bookmark.content.text`
- Custom Title (TextField, optional) — pre-populated from `bookmark.title ?? ""`
- Tags (TagPicker) — pre-populated from `bookmark.tags.map(t => t.id)` via `initialTagIds`
- Add New Tag (TextField)

No List field (see List Membership section above).

**Props:** `{ bookmark: Bookmark; onRefresh?: () => void }`

**Submit:**

1. `fetchUpdateBookmark(bookmark.id, { title: values.title.trim(), text: values.content.trim() })` — `text` is the API field name for note body on the PATCH endpoint, matching `bookmark.content.text` on the read side.
2. If `addedTagIds.length > 0`: `fetchAttachTagsToBookmark(bookmark.id, buildTagsToAttach())`
3. If `removedTagIds.length > 0`: `fetchDetachTagsFromBookmark(bookmark.id, buildTagsToDetach())`
4. Call `onRefresh?.()` then `pop()`

**Content validation:** Same pattern as `createNote` — show error if empty or over 2500 chars. Enforce in both `onChange` and `onSubmit`.

---

## Modified Files

### `src/apis/index.ts`

Add:

```ts
export async function fetchDetachTagsFromBookmark(
  bookmarkId: string,
  tags: Array<{ tagId: string }>,
): Promise<unknown> {
  return fetchWithAuth(`/api/v1/bookmarks/${bookmarkId}/tags`, {
    method: "DELETE",
    body: { tags },
  });
}
```

### `src/createBookmark.tsx`

- Remove: `NEW_TAG_PREFIX`, `TAG_PICKER_NOOP_VALUE`, `newTagItems`, `pendingInput`, `selectedTagIds`, `selectedTagIdsRef` state/ref, `commitNewTag`, `onPendingInputChange`, `onTagIdsChange`, inline `tagsToAttach` loop
- Add: `useTagPicker({ tags })` call; destructure needed values
- In `onSubmit`: replace inline loop with `buildTagsToAttach()`. No `reset()` needed — `createBookmark` uses `pop()` on success.
- JSX: unchanged structure

### `src/createNote.tsx`

- Same removals as `createBookmark.tsx`
- Add: `useTagPicker({ tags })` call; call `reset()` after `setContent("")` on successful submit
- JSX: unchanged structure

### `src/components/BookmarkEdit.tsx`

Add:

- `useGetAllTags` → passed to `useTagPicker({ tags, initialTagIds: bookmark.tags.map(t => t.id) })`
- Tags (TagPicker) + Add New Tag (TextField) from hook

Remove: List Dropdown (was not present before; do not add it).

Submit: after existing `fetchUpdateBookmark(bookmark.id, { title, note })`, add:

- If `addedTagIds.length > 0`: `fetchAttachTagsToBookmark(bookmark.id, buildTagsToAttach())`
- If `removedTagIds.length > 0`: `fetchDetachTagsFromBookmark(bookmark.id, buildTagsToDetach())`

### `src/components/BookmarkDetail.tsx`

Add import: `import { NoteEdit } from "./NoteEdit";`

Branch `handleEdit` on bookmark type:

```ts
const handleEdit = async () => {
  if (bookmark.content.type === "text") {
    push(<NoteEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  } else {
    push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  }
};
```

`asset` bookmarks fall through to `BookmarkEdit` via the `else` branch — intentional.

### `src/components/BookmarkItem.tsx`

Add import: `import { NoteEdit } from "./NoteEdit";`

Same branching logic in `handleEdit` callback. `asset` bookmarks use `BookmarkEdit` via the `else` branch.

---

## Data Flow

```txt
useTagPicker({ tags, initialTagIds? })
  └── selectedTagIds, newTagItems, pendingInput (state)
  └── selectedTagIdsRef (ref, keeps callbacks fresh)
  └── addedTagIds (derived: selectedTagIds minus initialTagIds)
  └── removedTagIds (derived: initialTagIds minus selectedTagIds)
  └── onTagIdsChange → updates state + ref + prunes newTagItems
  └── onPendingInputChange → splits on comma, commits parts via commitNewTag
  └── commitPendingTag → commits pendingInput on blur via commitNewTag
  └── buildTagsToAttach() → delegates to utils/tags.ts with current state
  └── buildTagsToDetach() → maps removedTagIds to [{ tagId }]
  └── reset() → clears all state; create forms only

Form components
  └── createBookmark, createNote: useTagPicker({ tags })
      └── onSubmit: buildTagsToAttach() → fetchAttachTagsToBookmark
      └── createNote only: reset() after success
  └── BookmarkEdit, NoteEdit: useTagPicker({ tags, initialTagIds })
      └── onSubmit: addedTagIds → fetchAttachTagsToBookmark(buildTagsToAttach())
      └── onSubmit: removedTagIds → fetchDetachTagsFromBookmark(buildTagsToDetach())
      └── no reset() call
```

---

## Routing Summary

| Bookmark type | From             | Action | Pushed component             |
| ------------- | ---------------- | ------ | ---------------------------- |
| `link`        | `BookmarkDetail` | Edit   | `BookmarkEdit`               |
| `link`        | `BookmarkItem`   | Edit   | `BookmarkEdit`               |
| `text`        | `BookmarkDetail` | Edit   | `NoteEdit` (new)             |
| `text`        | `BookmarkItem`   | Edit   | `NoteEdit` (new)             |
| `asset`       | `BookmarkDetail` | Edit   | `BookmarkEdit` (else branch) |
| `asset`       | `BookmarkItem`   | Edit   | `BookmarkEdit` (else branch) |

---

## Non-Goals / Future Work

- List field on edit forms — deferred pending API support for reading list membership from a bookmark. List membership can only be managed from the Lists view.
- AI tag suggestions (separate feature)
