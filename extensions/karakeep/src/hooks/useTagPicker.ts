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
  const initialNewTagItems = initialTagIds
    .filter((id) => id.startsWith(NEW_TAG_PREFIX))
    .map((id) => ({ id, name: id.slice(NEW_TAG_PREFIX.length) }));

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [newTagItems, setNewTagItems] = useState<Array<{ id: string; name: string }>>(initialNewTagItems);
  const [pendingInput, setPendingInput] = useState("");
  const selectedTagIdsRef = useRef<string[]>(initialTagIds);

  // newTagItemsRef mirrors newTagItems state to prevent stale dedup when
  // commitNewTag is called multiple times in one render cycle (comma-split path).
  const newTagItemsRef = useRef<Array<{ id: string; name: string }>>(initialNewTagItems);

  // Capture initialTagIds on mount so addedTagIds/removedTagIds remain stable
  // even when the caller passes an inline array that creates a new reference each render.
  const initialTagIdsRef = useRef<string[]>(initialTagIds);

  function commitNewTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    // If the typed name matches an existing tag, select it instead of creating a new one.
    const existingTag = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existingTag) {
      if (!selectedTagIdsRef.current.includes(existingTag.id)) {
        const next = [...selectedTagIdsRef.current, existingTag.id];
        selectedTagIdsRef.current = next;
        setSelectedTagIds(next);
      }
      return;
    }

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

  const addedTagIds = selectedTagIds.filter((id) => !initialTagIdsRef.current.includes(id));
  const removedTagIds = initialTagIdsRef.current.filter((id) => !selectedTagIds.includes(id));

  return {
    selectedTagIds,
    newTagItems,
    pendingInput,
    onTagIdsChange,
    onPendingInputChange,
    commitPendingTag,
    addedTagIds,
    removedTagIds,
    buildTagsToAttach: () => buildTagsToAttach(addedTagIds, newTagItems),
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
