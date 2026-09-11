# Tag Picker Hook & Note Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract duplicated tag-picking logic into a `useTagPicker` hook, add full tag editing to `BookmarkEdit`, create `NoteEdit` for text bookmarks, and route edit actions to the correct form by type.

**Architecture:** A new `useTagPicker` hook owns all tag state, derived values (`addedTagIds`, `removedTagIds`), and payload builders. A pure utility `buildTagsToAttach` in `src/utils/tags.ts` is used internally by the hook. `NoteEdit` is a new component mirroring `BookmarkEdit` but for `type: "text"` bookmarks. Both `BookmarkDetail` and `BookmarkItem` branch on `bookmark.content.type` to push the correct edit form.

**Tech Stack:** TypeScript, React, Raycast API (`@raycast/api`, `@raycast/utils`), `@chrismessina/raycast-logger`

---

## File Map

| File                                | Action     | Responsibility                                          |
| ----------------------------------- | ---------- | ------------------------------------------------------- |
| `src/hooks/useTagPicker.ts`         | **Create** | All tag-picking state, derived values, payload builders |
| `src/utils/tags.ts`                 | **Create** | Pure `buildTagsToAttach` utility                        |
| `src/components/NoteEdit.tsx`       | **Create** | Edit form for `type: "text"` bookmarks                  |
| `src/apis/index.ts`                 | **Modify** | Add `fetchDetachTagsFromBookmark`                       |
| `src/createBookmark.tsx`            | **Modify** | Swap inline tag logic for `useTagPicker`                |
| `src/createNote.tsx`                | **Modify** | Swap inline tag logic for `useTagPicker`                |
| `src/components/BookmarkEdit.tsx`   | **Modify** | Add tag fields using `useTagPicker`                     |
| `src/components/BookmarkDetail.tsx` | **Modify** | Branch `handleEdit` by bookmark type                    |
| `src/components/BookmarkItem.tsx`   | **Modify** | Branch `handleEdit` by bookmark type                    |

---

## Task 1: Add `fetchDetachTagsFromBookmark` to the API layer

**Files:**

- Modify: `src/apis/index.ts`

The Karakeep API supports `DELETE /api/v1/bookmarks/{bookmarkId}/tags` with a body of `{ tags: [{ tagId, tagName }] }`. This task adds the corresponding fetch function alongside the existing `fetchAttachTagsToBookmark`.

- [ ] **Step 1: Add the function**

Open `src/apis/index.ts`. After the `fetchAttachTagsToBookmark` function (currently the last function in the file), add:

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

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/apis/index.ts
git commit -m "feat: add fetchDetachTagsFromBookmark API function"
```

---

## Task 2: Create `src/utils/tags.ts`

**Files:**

- Create: `src/utils/tags.ts`

This is a pure function with no side effects. It takes `selectedTagIds` and `newTagItems`, and maps each ID to the correct API payload shape. IDs starting with `"new:"` are new tags (look up name from `newTagItems`); all others are existing tags (use ID directly).

- [ ] **Step 1: Create the file**

```ts
// src/utils/tags.ts

export const NEW_TAG_PREFIX = "new:";

export function buildTagsToAttach(
  selectedTagIds: string[],
  newTagItems: Array<{ id: string; name: string }>,
): Array<{ tagId?: string; tagName?: string; attachedBy: "human" }> {
  return selectedTagIds.map((id) => {
    if (id.startsWith(NEW_TAG_PREFIX)) {
      const item = newTagItems.find((t) => t.id === id);
      return { tagName: item?.name ?? id.slice(NEW_TAG_PREFIX.length), attachedBy: "human" };
    }
    return { tagId: id, attachedBy: "human" };
  });
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/tags.ts
git commit -m "feat: add buildTagsToAttach utility"
```

---

## Task 3: Create `src/hooks/useTagPicker.ts`

**Files:**

- Create: `src/hooks/useTagPicker.ts`

This hook centralises all tag-picker state. Key design points:

- `selectedTagIdsRef` mirrors `selectedTagIds` state to prevent stale closures in `onTagIdsChange`
- `newTagItemsRef` mirrors `newTagItems` state to prevent stale dedup in `commitNewTag` when called multiple times in one render cycle (comma-split path). This is an addition beyond the spec's internals list, added to fix a real stale-closure bug.
- `addedTagIds` / `removedTagIds` are derived (not stored) from the diff against `initialTagIds`
- `TAG_PICKER_NOOP_VALUE` is a sentinel item in the TagPicker that prevents Raycast from collapsing an empty picker; it must be filtered out
- `commitNewTag` deduplicates against both existing `tags` and `newTagItemsRef.current`
- `NEW_TAG_PREFIX` is imported from `src/utils/tags.ts` (single source of truth)
- `reset()` is only safe to call from create forms (clears back to empty)

- [ ] **Step 1: Create the file**

```ts
// src/hooks/useTagPicker.ts

import { useRef, useState } from "react";
import { Tag } from "../types";
import { buildTagsToAttach, NEW_TAG_PREFIX } from "../utils/tags";

export const TAG_PICKER_NOOP_VALUE = "__tagpicker-noop__";

interface UseTagPickerOptions {
  tags: Tag[];
  initialTagIds?: string[];
}

interface UseTagPickerReturn {
  selectedTagIds: string[];
  newTagItems: Array<{ id: string; name: string }>;
  pendingInput: string;
  onTagIdsChange: (value: string[]) => void;
  onPendingInputChange: (text: string) => void;
  commitPendingTag: () => void;
  addedTagIds: string[];
  removedTagIds: string[];
  buildTagsToAttach: () => Array<{ tagId?: string; tagName?: string; attachedBy: "human" }>;
  buildTagsToDetach: () => Array<{ tagId: string }>;
  reset: () => void;
}

export function useTagPicker({ tags, initialTagIds = [] }: UseTagPickerOptions): UseTagPickerReturn {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [newTagItems, setNewTagItems] = useState<Array<{ id: string; name: string }>>(
    initialTagIds
      .filter((id) => id.startsWith(NEW_TAG_PREFIX))
      .map((id) => ({ id, name: id.slice(NEW_TAG_PREFIX.length) })),
  );
  const [pendingInput, setPendingInput] = useState("");
  const selectedTagIdsRef = useRef<string[]>(initialTagIds);

  // newTagItemsRef mirrors newTagItems state to prevent stale dedup when
  // commitNewTag is called multiple times in one render cycle (comma-split path).
  const newTagItemsRef = useRef<Array<{ id: string; name: string }>>(
    initialTagIds
      .filter((id) => id.startsWith(NEW_TAG_PREFIX))
      .map((id) => ({ id, name: id.slice(NEW_TAG_PREFIX.length) })),
  );

  function commitNewTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    if (newTagItemsRef.current.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    const id = `${NEW_TAG_PREFIX}${trimmed}`;
    const nextItems = [...newTagItemsRef.current, { id, name: trimmed }];
    newTagItemsRef.current = nextItems;
    setNewTagItems(nextItems);
    const next = [...selectedTagIdsRef.current, id];
    selectedTagIdsRef.current = next;
    setSelectedTagIds(next);
  }

  function onPendingInputChange(text: string) {
    if (text.includes(",")) {
      const parts = text.split(",");
      parts.slice(0, -1).forEach((p) => commitNewTag(p));
      setPendingInput(parts[parts.length - 1]);
    } else {
      setPendingInput(text);
    }
  }

  function commitPendingTag() {
    if (pendingInput.trim()) {
      commitNewTag(pendingInput);
      setPendingInput("");
    }
  }

  function onTagIdsChange(value: string[]) {
    const nextValue = value.filter((id) => id !== TAG_PICKER_NOOP_VALUE);
    selectedTagIdsRef.current = nextValue;
    setSelectedTagIds(nextValue);
    const nextItems = newTagItemsRef.current.filter((item) => nextValue.includes(item.id));
    newTagItemsRef.current = nextItems;
    setNewTagItems(nextItems);
  }

  const addedTagIds = selectedTagIds.filter((id) => !initialTagIds.includes(id));
  const removedTagIds = initialTagIds.filter((id) => !selectedTagIds.includes(id));

  return {
    selectedTagIds,
    newTagItems,
    pendingInput,
    onTagIdsChange,
    onPendingInputChange,
    commitPendingTag,
    addedTagIds,
    removedTagIds,
    buildTagsToAttach: () => buildTagsToAttach(selectedTagIds, newTagItems),
    buildTagsToDetach: () => removedTagIds.map((tagId) => ({ tagId })),
    reset: () => {
      setSelectedTagIds([]);
      setNewTagItems([]);
      setPendingInput("");
      selectedTagIdsRef.current = [];
      newTagItemsRef.current = [];
    },
  };
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTagPicker.ts
git commit -m "feat: add useTagPicker hook"
```

---

## Task 4: Refactor `createBookmark.tsx` to use `useTagPicker`

**Files:**

- Modify: `src/createBookmark.tsx`

Replace the inline tag state/logic with the hook. The JSX structure stays identical — only the source of the values changes.

- [ ] **Step 1: Update imports**

Replace:

```ts
import { useEffect, useRef, useState } from "react";
```

with:

```ts
import { useEffect, useState } from "react";
```

Add to imports:

```ts
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "./hooks/useTagPicker";
```

Remove from imports: `fetchAttachTagsToBookmark` is still needed; no import changes there.

- [ ] **Step 2: Remove the inline constants, state, and functions**

Do these removals in one pass to avoid intermediate reference errors:

Remove these module-level constants:

```ts
const NEW_TAG_PREFIX = "new:";
const TAG_PICKER_NOOP_VALUE = "__tagpicker-noop__";
```

Remove `const initialSelectedTagIds = draftValues?.tagIds ?? [];` (line ~40, declared before hooks — it will be re-declared inside the hook call in Step 3).

Remove the state declarations:

```ts
const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialSelectedTagIds);
const [newTagItems, setNewTagItems] = useState<Array<{ id: string; name: string }>>(...)
const [pendingInput, setPendingInput] = useState(draftValues?.pendingNewTag ?? "");
const selectedTagIdsRef = useRef<string[]>(initialSelectedTagIds);
```

Remove the three functions: `commitNewTag`, `onPendingInputChange`, `onTagIdsChange`.

- [ ] **Step 3: Add the hook call**

After the `useGetAllTags` line, add (this re-declares `initialSelectedTagIds` in the right place):

```ts
const initialSelectedTagIds = draftValues?.tagIds ?? [];
const {
  selectedTagIds,
  newTagItems,
  pendingInput,
  onTagIdsChange,
  onPendingInputChange,
  commitPendingTag,
  buildTagsToAttach,
} = useTagPicker({ tags, initialTagIds: initialSelectedTagIds });
```

- [ ] **Step 4: Update `onSubmit`**

Replace the inline `tagsToAttach` loop:

```ts
const tagsToAttach: Array<{ tagId?: string; tagName?: string; attachedBy: "human" }> = [];
for (const v of selectedTagIds) {
  if (v.startsWith(NEW_TAG_PREFIX)) {
    tagsToAttach.push({ tagName: v.slice(NEW_TAG_PREFIX.length), attachedBy: "human" });
  } else {
    tagsToAttach.push({ tagId: v, attachedBy: "human" });
  }
}
if (tagsToAttach.length > 0) {
  await fetchAttachTagsToBookmark(created.id, tagsToAttach);
}
```

With:

```ts
const tagsToAttach = buildTagsToAttach();
if (tagsToAttach.length > 0) {
  await fetchAttachTagsToBookmark(created.id, tagsToAttach);
}
```

- [ ] **Step 5: Update JSX `onBlur` on the pending tag field**

Replace:

```ts
onBlur={() => {
  if (pendingInput.trim()) {
    commitNewTag(pendingInput);
    setPendingInput("");
  }
}}
```

With:

```ts
onBlur = { commitPendingTag };
```

- [ ] **Step 6: Verify it builds and lints**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/createBookmark.tsx
git commit -m "refactor: use useTagPicker in createBookmark"
```

---

## Task 5: Refactor `createNote.tsx` to use `useTagPicker`

**Files:**

- Modify: `src/createNote.tsx`

Same pattern as Task 4. `createNote` also calls `reset()` after a successful submit (it uses `useCachedState` for the content draft and calls `setContent("")` on success).

- [ ] **Step 1: Update imports**

Replace:

```ts
import { useRef, useState } from "react";
```

With:

```ts
import { useState } from "react";
```

Add:

```ts
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "./hooks/useTagPicker";
```

- [ ] **Step 2: Remove inline constants, state, and functions**

Remove:

```ts
const NEW_TAG_PREFIX = "new:";
const TAG_PICKER_NOOP_VALUE = "__tagpicker-noop__";
```

Remove state:

```ts
const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
const [newTagItems, setNewTagItems] = useState<Array<{ id: string; name: string }>>([]);
const [pendingInput, setPendingInput] = useState("");
const selectedTagIdsRef = useRef<string[]>([]);
```

Remove functions: `commitNewTag`, `onPendingInputChange`, `onTagIdsChange`.

- [ ] **Step 3: Add the hook call**

After the `useGetAllTags` line, add:

```ts
const {
  selectedTagIds,
  newTagItems,
  pendingInput,
  onTagIdsChange,
  onPendingInputChange,
  commitPendingTag,
  buildTagsToAttach,
  reset,
} = useTagPicker({ tags });
```

- [ ] **Step 4: Update `onSubmit`**

Replace the inline loop with:

```ts
const tagsToAttach = buildTagsToAttach();
if (tagsToAttach.length > 0) {
  await fetchAttachTagsToBookmark(created.id, tagsToAttach);
}
```

`createNote` gates success actions on `if (!bookmark) return;` after `runWithToast`. Place `reset()` inside that guard, alongside `setContent("")`. Preserve the existing `closeMainWindow` call:

```ts
if (!bookmark) return;

setContent("");
reset();  // ← add here, inside the guard
push(<BookmarkDetail bookmark={bookmark} />);
await closeMainWindow({ clearRootSearch: true });
```

- [ ] **Step 5: Update JSX `onBlur`**

Replace the `onBlur` on the pending tag field with:

```ts
onBlur = { commitPendingTag };
```

- [ ] **Step 6: Verify it builds and lints**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/createNote.tsx
git commit -m "refactor: use useTagPicker in createNote"
```

---

## Task 6: Update `BookmarkEdit.tsx` to add tag fields

**Files:**

- Modify: `src/components/BookmarkEdit.tsx`

Add `useGetAllTags` and `useTagPicker` to the edit form. On submit, attach added tags and detach removed tags. The existing title + note fields are unchanged.

- [ ] **Step 1: Update imports**

Add to existing imports:

```ts
import { fetchAttachTagsToBookmark, fetchDetachTagsFromBookmark, fetchUpdateBookmark } from "../apis";
import { useGetAllTags } from "../hooks/useGetAllTags";
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "../hooks/useTagPicker";
```

(`fetchUpdateBookmark` is already imported; just add the two new ones alongside it.)

- [ ] **Step 2: Add hooks inside the component**

After `const { t } = useTranslation();`, add:

```ts
const { tags } = useGetAllTags();
const {
  selectedTagIds,
  newTagItems,
  pendingInput,
  onTagIdsChange,
  onPendingInputChange,
  commitPendingTag,
  addedTagIds,
  removedTagIds,
  buildTagsToAttach,
  buildTagsToDetach,
} = useTagPicker({ tags, initialTagIds: bookmark.tags.map((t) => t.id) });
```

- [ ] **Step 3: Update `onSubmit`**

`BookmarkEdit` uses a manual `showToast` + try/catch (not `runWithToast`). The new tag calls must go **inside the existing `try` block**, immediately after `await fetchUpdateBookmark(bookmark.id, payload);`:

```ts
const tagsToAttach = buildTagsToAttach();
if (addedTagIds.length > 0) {
  await fetchAttachTagsToBookmark(bookmark.id, tagsToAttach);
}
if (removedTagIds.length > 0) {
  await fetchDetachTagsFromBookmark(bookmark.id, buildTagsToDetach());
}
```

- [ ] **Step 4: Add tag JSX fields**

After the existing `Form.TextArea` for note (the last field before `</Form>`), add:

```tsx
<Form.TagPicker
  id="tagIds"
  title={t("bookmark.tags")}
  placeholder={t("bookmark.tagsPlaceholder")}
  value={selectedTagIds}
  onChange={onTagIdsChange}
>
  <Form.TagPicker.Item value={TAG_PICKER_NOOP_VALUE} title=" " />
  {tags.map((tag) => (
    <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
  ))}
  {newTagItems.map((item) => (
    <Form.TagPicker.Item key={item.id} value={item.id} title={item.name} />
  ))}
</Form.TagPicker>

<Form.TextField
  id="pendingNewTag"
  title={t("bookmark.newTags")}
  placeholder={t("bookmark.newTagsPlaceholder")}
  value={pendingInput}
  onChange={onPendingInputChange}
  onBlur={commitPendingTag}
/>
```

- [ ] **Step 5: Verify it builds and lints**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/BookmarkEdit.tsx
git commit -m "feat: add tag picker to BookmarkEdit"
```

---

## Task 7: Create `NoteEdit.tsx`

**Files:**

- Create: `src/components/NoteEdit.tsx`

Edit form for `type: "text"` bookmarks. Fields: Content (TextArea, required, max 2500 chars), Custom Title (TextField, optional), Tags (TagPicker), Add New Tag (TextField). No List field.

The `initialTagIds` passed to `useTagPicker` comes from `bookmark.tags.map(t => t.id)` — these are the existing human and AI tags on the bookmark.

Note: `bookmark.content.text` is the note body on read; `text` is the field name on PATCH.

- [ ] **Step 1: Create the file**

```tsx
// src/components/NoteEdit.tsx

import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAttachTagsToBookmark, fetchDetachTagsFromBookmark, fetchUpdateBookmark } from "../apis";
import { useGetAllTags } from "../hooks/useGetAllTags";
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "../hooks/useTagPicker";
import { useTranslation } from "../hooks/useTranslation";
import { runWithToast } from "../utils/toast";
import { Bookmark } from "../types";

const log = logger.child("[NoteEdit]");

const MAX_NOTE_LENGTH = 2500;

interface NoteEditProps {
  bookmark: Bookmark;
  onRefresh?: () => void;
}

interface FormValues {
  content: string;
  title: string;
}

export function NoteEdit({ bookmark, onRefresh }: NoteEditProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { tags } = useGetAllTags();
  const {
    selectedTagIds,
    newTagItems,
    pendingInput,
    onTagIdsChange,
    onPendingInputChange,
    commitPendingTag,
    addedTagIds,
    removedTagIds,
    buildTagsToAttach,
    buildTagsToDetach,
  } = useTagPicker({ tags, initialTagIds: bookmark.tags.map((tag) => tag.id) });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      // BookmarkContent has text?: string as an optional field on a flat interface
      // (not a discriminated union), so this access is safe without a cast.
      content: bookmark.content.text ?? "",
      title: bookmark.title ?? "",
    },
    validation: {
      content: (value) => {
        if (!value || value.trim().length === 0) return t("bookmark.contentRequired");
        if (value.length > MAX_NOTE_LENGTH) return t("bookmark.contentTooLong");
        return undefined;
      },
    },
    async onSubmit(values) {
      log.info("Updating note", { bookmarkId: bookmark.id });
      await runWithToast({
        loading: { title: t("bookmark.updating") },
        success: { title: t("bookmark.updateSuccess") },
        failure: { title: t("bookmark.updateFailed") },
        action: async () => {
          await fetchUpdateBookmark(bookmark.id, {
            title: values.title.trim(),
            text: values.content.trim(),
          });

          const tagsToAttach = buildTagsToAttach();
          if (addedTagIds.length > 0) {
            await fetchAttachTagsToBookmark(bookmark.id, tagsToAttach);
          }
          if (removedTagIds.length > 0) {
            await fetchDetachTagsFromBookmark(bookmark.id, buildTagsToDetach());
          }
        },
      });

      // onRefresh and pop run after runWithToast resolves. runWithToast catches
      // API errors and shows a failure toast without re-throwing, so these lines
      // run whether the update succeeded or failed. This matches BookmarkEdit's
      // existing pattern. If strictly on-success-only behaviour is needed in
      // future, runWithToast should be replaced with a manual try/catch.
      log.info("Note updated", { bookmarkId: bookmark.id });
      await onRefresh?.();
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.update")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.content}
        title={t("bookmark.content")}
        placeholder={t("bookmark.contentPlaceholder")}
        enableMarkdown
      />

      <Form.TextField
        {...itemProps.title}
        title={t("bookmark.customTitle")}
        placeholder={t("bookmark.titlePlaceholder")}
      />

      <Form.TagPicker
        id="tagIds"
        title={t("bookmark.tags")}
        placeholder={t("bookmark.tagsPlaceholder")}
        value={selectedTagIds}
        onChange={onTagIdsChange}
      >
        <Form.TagPicker.Item value={TAG_PICKER_NOOP_VALUE} title=" " />
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
        {newTagItems.map((item) => (
          <Form.TagPicker.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="pendingNewTag"
        title={t("bookmark.newTags")}
        placeholder={t("bookmark.newTagsPlaceholder")}
        value={pendingInput}
        onChange={onPendingInputChange}
        onBlur={commitPendingTag}
      />
    </Form>
  );
}
```

- [ ] **Step 2: Verify it builds and lints**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/NoteEdit.tsx
git commit -m "feat: add NoteEdit component for text bookmark editing"
```

---

## Task 8: Update routing in `BookmarkDetail` and `BookmarkItem`

**Files:**

- Modify: `src/components/BookmarkDetail.tsx`
- Modify: `src/components/BookmarkItem.tsx`

Both files currently push `<BookmarkEdit>` unconditionally. Update both to branch on `bookmark.content.type === "text"` and push `<NoteEdit>` for notes, `<BookmarkEdit>` for everything else.

- [ ] **Step 1: Update `BookmarkDetail.tsx`**

Add import after the existing `BookmarkEdit` import:

```ts
import { NoteEdit } from "./NoteEdit";
```

Replace `handleEdit` (keeping `async` to match existing code style):

```ts
const handleEdit = async () => {
  if (bookmark.content.type === "text") {
    push(<NoteEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  } else {
    push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  }
};
```

- [ ] **Step 2: Update `BookmarkItem.tsx`**

Add import after the existing `BookmarkEdit` import:

```ts
import { NoteEdit } from "./NoteEdit";
```

Replace `handleEdit` inside `useBookmarkHandlers`:

```ts
const handleEdit = useCallback(() => {
  if (bookmark.content.type === "text") {
    push(<NoteEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  } else {
    push(<BookmarkEdit bookmark={bookmark} onRefresh={handleEditUpdate} />);
  }
}, [bookmark, handleEditUpdate, push]);
```

- [ ] **Step 3: Verify it builds and lints**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BookmarkDetail.tsx src/components/BookmarkItem.tsx
git commit -m "feat: route edit action to NoteEdit for text bookmarks"
```

---

## Task 9: Final verification and lint

- [ ] **Step 1: Full build and lint**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && npm run build 2>&1 && npm run lint 2>&1
```

Expected: clean output, no errors or warnings.

- [ ] **Step 2: Verify no stale references to old constants**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && grep -r "NEW_TAG_PREFIX\|TAG_PICKER_NOOP_VALUE" src/ --include="*.ts" --include="*.tsx"
```

Expected output: only `src/utils/tags.ts` exports `NEW_TAG_PREFIX`, and `src/hooks/useTagPicker.ts` exports `TAG_PICKER_NOOP_VALUE`. No other files should define them inline.

- [ ] **Step 3: Verify no inline `tagsToAttach` loops remain**

```bash
cd /Users/messina/Developer/GitHub/chrismessina/karakeep && grep -r "tagsToAttach\|NEW_TAG_PREFIX\|selectedTagIdsRef" src/createBookmark.tsx src/createNote.tsx
```

Expected: no matches (all replaced by hook).

- [ ] **Step 4: Commit if any lint fixes were needed, otherwise done**

```bash
git status
```

If clean: no action needed. If lint auto-fixes were applied:

```bash
git add -p
git commit -m "chore: lint fixes after tag picker refactor"
```
