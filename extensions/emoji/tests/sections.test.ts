import { describe, expect, it } from "vitest";
import { EmojiSearchIndex, SearchableEmoji } from "../src/search";
import { ALL_EMOJIS, RECENTLY_USED, emojiSections } from "../src/sections";

const catalog: SearchableEmoji[] = [
  { emoji: "🫡", description: "saluting face", category: "Smileys & Emotion" },
  { emoji: "🚀", description: "rocket", category: "Travel & Places" },
  { emoji: "🔥", description: "fire", category: "Travel & Places" },
];
const index = new EmojiSearchIndex(catalog);

describe("emoji sections", () => {
  it("shows recents first and all remaining emojis below without duplicates", () => {
    expect(emojiSections(catalog, [catalog[1]], index, "", RECENTLY_USED)).toEqual([
      { title: RECENTLY_USED, emojis: [catalog[1]] },
      { title: ALL_EMOJIS, emojis: [catalog[0], catalog[2]] },
    ]);
  });
  it("shows the full catalog on first use without an empty recents section", () => {
    expect(emojiSections(catalog, [], index, "", RECENTLY_USED)).toEqual([{ title: ALL_EMOJIS, emojis: catalog }]);
  });
  it("does not wait for the catalog to show recent emojis", () => {
    expect(emojiSections([], [catalog[1]], new EmojiSearchIndex([]), "", RECENTLY_USED, false)).toEqual([
      { title: RECENTLY_USED, emojis: [catalog[1]] },
    ]);
  });
  it("searches beyond recents when typing from the default view", () => {
    expect(emojiSections(catalog, [catalog[1]], index, "roger that", RECENTLY_USED)).toEqual([
      { title: ALL_EMOJIS, emojis: [catalog[0]] },
    ]);
  });
  it("returns to recents above all emojis when the query is cleared", () => {
    emojiSections(catalog, [catalog[1]], index, "fire", RECENTLY_USED);
    expect(emojiSections(catalog, [catalog[1]], index, "  ", RECENTLY_USED).map((section) => section.title)).toEqual([
      RECENTLY_USED,
      ALL_EMOJIS,
    ]);
  });
  it("respects an explicitly chosen category while searching", () => {
    expect(emojiSections(catalog, [], index, "rocket", "Smileys & Emotion")[0].emojis).toEqual([]);
    expect(emojiSections(catalog, [], index, "", "Travel & Places")[0].emojis).toEqual([catalog[1], catalog[2]]);
  });
  it("allows browsing all emojis without a separate recents section", () => {
    expect(emojiSections(catalog, [catalog[1]], index, "", "")).toEqual([{ title: ALL_EMOJIS, emojis: catalog }]);
  });
});
