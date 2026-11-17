import { describe, expect, test } from "bun:test";
import {
  hiddenAfterTaggingMessage,
  newlyHiddenTag,
  searchNamesHiddenTag,
  shouldCheckForHiddenCards,
} from "../lib/hiddenTags";
import { parseSearchFilters } from "../lib/searchFilters";

describe("hidden tags", () => {
  test("tells the person how to see a card they just hid", () => {
    expect(newlyHiddenTag(["design"], ["design", "Secret"])).toBe("secret");
    expect(hiddenAfterTaggingMessage("secret")).toBe(
      "Hidden. Search #secret to see it.",
    );
  });

  test("says nothing for a card that was already hidden or isn't now", () => {
    expect(newlyHiddenTag(["hidden"], ["hidden", "secret"])).toBeNull();
    expect(newlyHiddenTag(["design"], ["design", "ideas"])).toBeNull();
  });

  test.each([
    ["tag:secret", true],
    ["tag:Hidden", true],
    ["#secret", true],
    ["design #hidden", true],
    ["secret", false],
    ["tag:design", false],
  ])("a search for %p names a hidden tag: %p", (search, expected) => {
    expect(searchNamesHiddenTag(parseSearchFilters(search))).toBe(expected);
  });

  test("checks for hidden cards behind a blank search or the plain word", () => {
    expect(shouldCheckForHiddenCards(parseSearchFilters(""))).toBe(true);
    expect(shouldCheckForHiddenCards(parseSearchFilters("secret"))).toBe(true);
    expect(shouldCheckForHiddenCards(parseSearchFilters("poster"))).toBe(false);
    expect(shouldCheckForHiddenCards(parseSearchFilters("tag:secret"))).toBe(
      false,
    );
    expect(shouldCheckForHiddenCards(parseSearchFilters("trash"))).toBe(false);
  });
});
