// Raycast can't import the workspace when it ships, so it keeps small copies
// of a few of Teak's tables. These tests check each copy against the original
// and need the monorepo (they fail in a copy of apps/raycast made on its own).
import { expect, test } from "bun:test";
import {
  COLOR_HUE_BUCKETS,
  VISUAL_STYLE_TAXONOMY,
} from "@teak/convex/shared/constants";
import {
  LINK_CATEGORIES,
  LINK_CATEGORY_DONE_VERB,
} from "@teak/convex/shared/linkCategories";
import { HIDDEN_TAG_KEYS } from "@teak/convex/shared/tags";
import { DONE_VERB_BY_CATEGORY } from "../lib/doneStates";
import { HIDDEN_TAGS } from "../lib/hiddenTags";
import { HUE_OPTIONS, STYLE_OPTIONS } from "../lib/searchFilters";

test("offers the same hue and style filters as Teak's search", () => {
  expect(HUE_OPTIONS).toEqual(COLOR_HUE_BUCKETS);
  expect(STYLE_OPTIONS).toEqual(VISUAL_STYLE_TAXONOMY);
});

test("names a link's done state the way Teak's apps do", () => {
  expect(Object.keys(DONE_VERB_BY_CATEGORY).sort()).toEqual(
    [...LINK_CATEGORIES].sort(),
  );
  expect(DONE_VERB_BY_CATEGORY).toEqual(LINK_CATEGORY_DONE_VERB);
});

test("hides the same tags as Teak's search", () => {
  expect([...HIDDEN_TAGS]).toEqual([...HIDDEN_TAG_KEYS]);
});
