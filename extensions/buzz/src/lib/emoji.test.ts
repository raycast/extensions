import { describe, it, expect } from "vitest";
import { EMOJI, emojiSearchTerms, searchEmoji } from "./emoji";

describe("EMOJI dataset", () => {
  it("is a non-trivial curated list", () => {
    expect(EMOJI.length).toBeGreaterThanOrEqual(80);
  });

  it("has a unique shortcode for every entry", () => {
    expect(new Set(EMOJI.map((e) => e.shortcode)).size).toBe(EMOJI.length);
  });

  it("has a unique character for every entry", () => {
    expect(new Set(EMOJI.map((e) => e.char)).size).toBe(EMOJI.length);
  });

  it("wraps every shortcode in colons", () => {
    for (const entry of EMOJI) {
      expect(entry.shortcode).toMatch(/^:[a-z0-9_+-]+:$/);
    }
  });

  it("gives every entry non-empty keywords, which the dropdown item passes to Raycast's filter", () => {
    for (const entry of EMOJI) {
      expect(entry.keywords.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers the situations a work status actually needs", () => {
    const shortcodes = EMOJI.map((e) => e.shortcode);
    for (const required of [":calendar:", ":brain:", ":fork_and_knife:", ":palm_tree:", ":house_with_garden:"]) {
      expect(shortcodes).toContain(required);
    }
  });
});

describe("emojiSearchTerms", () => {
  const find = (shortcode: string) => EMOJI.find((e) => e.shortcode === shortcode)!;

  it("includes the shortcode's own name, which the colons hid from the filter", () => {
    expect(emojiSearchTerms(find(":brain:"))).toContain("brain");
  });

  it("splits an underscored name into its parts as well as the whole", () => {
    const terms = emojiSearchTerms(find(":sneezing_face:"));
    expect(terms).toContain("sneezing_face");
    expect(terms).toContain("sneezing");
    expect(terms).toContain("face");
  });

  it("keeps the curated keywords alongside the derived name", () => {
    const terms = emojiSearchTerms(find(":palm_tree:"));
    expect(terms).toEqual(expect.arrayContaining(["holiday", "vacation", "away", "ooo"]));
  });

  it("never repeats a term when the name already appears in the keywords", () => {
    for (const entry of EMOJI) {
      const terms = emojiSearchTerms(entry);
      expect(new Set(terms).size).toBe(terms.length);
    }
  });

  it("gives every entry at least one term", () => {
    for (const entry of EMOJI) {
      expect(emojiSearchTerms(entry).length).toBeGreaterThan(0);
    }
  });

  it("emits no empty strings, which would match everything", () => {
    for (const entry of EMOJI) {
      expect(emojiSearchTerms(entry).every((t) => t.length > 0)).toBe(true);
    }
  });
});

describe("searchEmoji", () => {
  const shortcodes = (q: string) => searchEmoji(q).map((e) => e.shortcode);

  it("returns everything for an empty or whitespace query", () => {
    expect(searchEmoji("")).toHaveLength(EMOJI.length);
    expect(searchEmoji("   ")).toHaveLength(EMOJI.length);
  });

  it("finds an emoji by its plain name, the case that was broken", () => {
    expect(shortcodes("brain")).toContain(":brain:");
  });

  it("still finds it when the user types the colon out of habit", () => {
    expect(shortcodes(":brain")).toContain(":brain:");
    expect(shortcodes(":brain:")).toContain(":brain:");
  });

  it("finds an emoji by a curated keyword, which native filtering never did", () => {
    expect(shortcodes("lunch")).toContain(":fork_and_knife:");
    expect(shortcodes("vacation")).toContain(":palm_tree:");
  });

  it("finds a word from the middle of an underscored name", () => {
    expect(shortcodes("face")).toContain(":sneezing_face:");
  });

  it("matches a subsequence, so a fast typist still lands", () => {
    expect(shortcodes("snzng")).toContain(":sneezing_face:");
  });

  it("is case insensitive", () => {
    expect(shortcodes("BRAIN")).toEqual(shortcodes("brain"));
  });

  it("ranks an exact name above an incidental keyword mention", () => {
    // :bulb: carries the keyword "brainstorming", which contains "brain".
    const results = shortcodes("brain");
    expect(results.indexOf(":brain:")).toBeLessThan(results.indexOf(":bulb:"));
  });

  it("ranks a prefix match above a mere subsequence", () => {
    const results = shortcodes("bee");
    expect(results[0]).toBe(":bee:");
  });

  it("returns nothing when nothing matches", () => {
    expect(searchEmoji("zzzzqqqq")).toEqual([]);
  });

  it("keeps dataset order among equally scored entries", () => {
    // "holiday" is a keyword on exactly these five entries, so they all score
    // 4 (an exact term match) and the tie has to fall back to dataset order.
    expect(shortcodes("holiday")).toEqual([":beach_with_umbrella:", ":palm_tree:", ":camping:", ":ski:", ":ocean:"]);
  });
});
