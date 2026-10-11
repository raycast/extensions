import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXTRA_ALIASES } from "../src/aliases";
import { EmojiSearchIndex, SearchableEmoji } from "../src/search";

const catalog: SearchableEmoji[] = JSON.parse(
  readFileSync(new URL("../assets/catalogs/15.1.json", import.meta.url), "utf8"),
);

describe("EmojiSearchIndex with the bundled Unicode catalog", () => {
  const search = new EmojiSearchIndex(catalog);
  it.each([
    ["warning", "⚠️"],
    ["rocket", "🚀"],
    ["fire", "🔥"],
    ["sleep", "😴"],
    ["phone", "📱"],
    ["mind blown", "🤯"],
    ["good job", "👍"],
    ["email", "✉️"],
    ["coffee", "☕"],
    ["home", "🏠"],
    ["meeting", "📅"],
    ["warnng", "⚠️"],
    ["rocekt", "🚀"],
    ["mind blwon", "🤯"],
    [":zap:", "⚡"],
    ["+1", "👍"],
    ["-1", "👎"],
    ["⚠", "⚠️"],
  ])("puts the expected emoji first for %s", (query, expected) => {
    expect(search.search(query)[0]?.emoji).toBe(expected);
  });
  it.each([
    ["mind blown", ["🍜", "👱‍♀️", "👱‍♂️"]],
    ["good job", ["🌇"]],
    ["thumbs up", ["👎"]],
    ["warning", ["🌖", "🌘"]],
    ["rocket", ["🦗", "🏏"]],
  ])("excludes irrelevant fuzzy results for %s", (query, excluded) => {
    const results = search.search(query).map((item) => item.emoji);
    for (const emoji of excluded) expect(results).not.toContain(emoji);
  });
  it("keeps category filtering when a typo needs correction", () => {
    expect(search.search("warnng", { category: "Smileys & Emotion" })).toEqual([]);
  });
  it("bundles shortcodes for Unicode sequences with variation selectors and joiners", () => {
    expect(catalog.find((item) => item.emoji === "❤️")?.shortCode).toContain("heart");
    expect(catalog.find((item) => item.emoji === "👩‍💻")?.shortCode).toContain("woman_technologist");
  });

  it("keeps every curated alias attached to a catalog emoji", () => {
    const symbols = new Set(catalog.map((item) => item.emoji));
    expect(Object.keys(EXTRA_ALIASES).filter((symbol) => !symbols.has(symbol))).toEqual([]);
  });

  it.each([
    ["laughing crying", "😂"],
    ["rofl", "🤣"],
    ["ugly crying", "😭"],
    ["puppy eyes", "🥺"],
    ["passive aggressive", "🙃"],
    ["mind blown", "🤯"],
    ["facepalm", "🤦"],
    ["idk", "🤷"],
    ["roger that", "🫡"],
    ["fingers crossed", "🤞"],
    ["chef's kiss", "🤌"],
    ["happy birthday", "🎂"],
    ["ship it", "🚀"],
    ["aha moment", "💡"],
    ["do not disturb", "🔕"],
    ["clean up", "🧹"],
    ["road trip", "🚗"],
    ["movie night", "🍿"],
    ["public transit", "🚌"],
    ["you got this", "💪"],
  ])("finds %s through curated aliases", (query, expected) => {
    expect(search.search(query)[0]?.emoji).toBe(expected);
  });

  it.each([
    ["deadpan", "😐"],
    ["no comment", "😑"],
    ["side eye", "😒"],
    ["oops", "🫢"],
    ["virtual hug", "🤗"],
    ["finger heart", "🫰"],
    ["rock on", "🤘"],
    ["ai", "🤖"],
    ["software engineer", "🧑‍💻"],
    ["low battery", "🪫"],
    ["wifi", "🛜"],
    ["archive", "🗃️"],
    ["stop", "🛑"],
    ["reload", "🔄"],
    ["bar chart", "📊"],
    ["subway", "🚇"],
    ["cruise", "🛳️"],
    ["rainy day", "🌧️"],
    ["taco tuesday", "🌮"],
    ["boba", "🧋"],
    ["disco", "🪩"],
    ["black cat", "🐈‍⬛"],
    ["jaws", "🦈"],
  ])("finds the second-pass alias %s", (query, expected) => {
    expect(search.search(query)[0]?.emoji).toBe(expected);
  });
});
