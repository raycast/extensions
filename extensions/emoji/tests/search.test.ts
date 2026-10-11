import { describe, expect, it } from "vitest";
import { EmojiSearchIndex, SearchableEmoji } from "../src/search";

const emoji = (
  symbol: string,
  description: string,
  keywords: string[] = [],
  category = "Symbols",
  shortCode: string[] = [],
): SearchableEmoji => ({ emoji: symbol, description, keywords, category, shortCode });

describe("EmojiSearchIndex", () => {
  it("ranks an exact description above generic keyword matches", () => {
    const search = new EmojiSearchIndex([
      emoji("🚸", "children crossing", ["warning"]),
      emoji("❗", "red exclamation mark", ["warning"]),
      emoji("⚠️", "warning", ["warning"]),
    ]);

    expect(search.search("warning")[0]?.emoji).toBe("⚠️");
  });

  it("ranks complete description tokens above generic keywords", () => {
    const search = new EmojiSearchIndex([
      emoji("🌑", "new moon", ["sleep"]),
      emoji("😴", "sleeping face", ["sleep", "tired"]),
      emoji("📱", "mobile phone", ["technology"]),
      emoji("📶", "antenna bars", ["phone"]),
    ]);

    expect(search.search("sleep")[0]?.emoji).toBe("😴");
    expect(search.search("phone")[0]?.emoji).toBe("📱");
  });

  it("matches multiword queries across semantic keywords", () => {
    const search = new EmojiSearchIndex([
      emoji("👱", "person: blond hair", ["person", "blond"]),
      emoji("🤯", "exploding head", ["mind", "blown", "shocked"]),
    ]);

    expect(search.search("mind blown")[0]?.emoji).toBe("🤯");
  });

  it("supports deliberate natural-language aliases", () => {
    const search = new EmojiSearchIndex([
      emoji("🌅", "sunrise", ["good", "morning"]),
      emoji("👍", "thumbs up", ["good", "agree"]),
      emoji("✉️", "envelope", ["mail"]),
      emoji("📬", "open mailbox with raised flag", ["email"]),
    ]);

    expect(search.search("good job")[0]?.emoji).toBe("👍");
    expect(search.search("email")[0]?.emoji).toBe("✉️");
  });

  it("indexes shortcodes", () => {
    const search = new EmojiSearchIndex([
      emoji("⚡", "high voltage", [], "Symbols", ["zap"]),
      emoji("🦓", "zebra", ["animal"]),
    ]);

    expect(search.search("zap")[0]?.emoji).toBe("⚡");
  });

  it("uses recent order only to break equal-relevance ties", () => {
    const left = emoji("⬅️", "left arrow", ["direction"]);
    const right = emoji("➡️", "right arrow", ["direction"]);
    const search = new EmojiSearchIndex([left, right]);

    expect(search.search("direction", { recentlyUsed: [right, left] }).map((item) => item.emoji)).toEqual(["➡️", "⬅️"]);
    expect(search.search("left", { recentlyUsed: [right, left] })[0]?.emoji).toBe("⬅️");
  });

  it("respects category filtering", () => {
    const search = new EmojiSearchIndex([
      emoji("🔥", "fire", ["hot"], "Travel & Places"),
      emoji("🧑‍🚒", "firefighter", ["fire"], "People & Body"),
    ]);

    expect(search.search("fire", { category: "People & Body" }).map((item) => item.emoji)).toEqual(["🧑‍🚒"]);
  });

  it("preserves source order for an empty search", () => {
    const items = [emoji("A", "first"), emoji("B", "second")];

    expect(new EmojiSearchIndex(items).search("")).toEqual(items);
  });

  it("returns all matching results by default while honoring an explicit caller limit", () => {
    const items = Array.from({ length: 150 }, (_, index) => emoji(String(index), "flag " + index));
    const search = new EmojiSearchIndex(items);
    expect(search.search("flag")).toEqual(items);
    expect(search.search("flag", { limit: 5 })).toEqual(items.slice(0, 5));
  });

  it("matches punctuation-only keywords exactly without matching unrelated punctuation or every emoji", () => {
    const smile = emoji("😄", "grinning face with smiling eyes", [":)"]);
    const sad = emoji("😞", "disappointed face", [":("]);
    const search = new EmojiSearchIndex([smile, sad, emoji("🚀", "rocket")]);
    expect(search.search(" : ) ")).toEqual([]);
    expect(search.search(" :) ")).toEqual([smile]);
    expect(search.search(":(")).toEqual([sad]);
    expect(search.search("???")).toEqual([]);
  });
});
