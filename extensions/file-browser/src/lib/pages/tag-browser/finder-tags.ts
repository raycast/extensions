import type { Color } from "@raycast/api";

import { getFinderTagColor } from "$lib/constants";
import type { FinderTag } from "$lib/types";

export type FinderTagView = FinderTag & {
  color: Color;
};

export function normaliseTagDisplayName(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function finderTagKey(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildEditableTagCatalog(entryTags: FinderTag[], envTags: FinderTag[]): FinderTag[] {
  const merged = new Map<string, FinderTag>();

  for (const tag of entryTags) {
    const key = finderTagKey(tag.name);
    if (key != null) {
      merged.set(key, tag);
    }
  }

  for (const tag of envTags) {
    const key = finderTagKey(tag.name);
    if (key != null) {
      merged.set(key, tag);
    }
  }

  return [...merged.values()];
}

export function buildAppliedUserTags(selectedNames: string[], editableCatalog: FinderTag[]): FinderTag[] {
  const catalogByKey = new Map<string, FinderTag>();
  for (const tag of editableCatalog) {
    const key = finderTagKey(tag.name);
    if (key != null) {
      catalogByKey.set(key, tag);
    }
  }

  return selectedNames
    .map((raw) => {
      const trimmed = normaliseTagDisplayName(raw);
      if (trimmed == null) return null;
      const key = finderTagKey(trimmed);
      const catalogTag = key != null ? catalogByKey.get(key) : undefined;
      return {
        name: catalogTag?.name ?? trimmed,
        colorIndex: catalogTag?.colorIndex ?? null,
      };
    })
    .filter((tag): tag is FinderTag => tag != null);
}

export function resolveFinderTagsForDisplay(itemTags: FinderTag[], catalogTags: FinderTag[] = []): FinderTag[] {
  const displayCatalog = buildEditableTagCatalog(itemTags, catalogTags);
  return buildAppliedUserTags(
    itemTags.map((tag) => tag.name),
    displayCatalog,
  );
}

export function buildFinderTagView(tag: FinderTag): FinderTagView {
  return {
    ...tag,
    color: resolveFinderTagColor(tag.colorIndex),
  };
}

export function buildFinderTagViews(itemTags: FinderTag[], catalogTags: FinderTag[] = []): FinderTagView[] {
  return resolveFinderTagsForDisplay(itemTags, catalogTags).map(buildFinderTagView);
}

export function resolveFinderTagColor(colorIndex: number | null | undefined): Color {
  return getFinderTagColor(colorIndex);
}
