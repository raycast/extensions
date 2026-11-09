import { describe, expect, it } from "vitest";
import { buildHugeiconsEntries } from "../../src/icons/hugeicons";
import { buildLucideEntries } from "../../src/icons/lucide";
import { aiRank, keywordSearch, normalizePhrase, prepareSearch, queryTerms } from "../../src/icons/search";
import { IconEntry } from "../../src/icons/types";
import { fixture, lucideSample, shippedHugeicons } from "./helpers";

const shipped = shippedHugeicons();
const allExports = JSON.parse(fixture("hugeicons-4.3.5-exports.json")) as Record<string, string[]>;
const huge = prepareSearch(
  buildHugeiconsEntries(
    shipped,
    Object.fromEntries(Object.keys(shipped.icons).map((file) => [file, allExports[file]])),
    "svg",
  ),
);
const sample = lucideSample();
const lucide = prepareSearch(buildLucideEntries(sample.tags, sample.categories, Object.keys(sample.tags), "svg"));

/** A catalog the size of Hugeicons' free set, for timing. */
const words = ["arrow", "ticket", "user", "file", "chart", "cloud", "home", "mail", "star", "lock", "camera", "music"];
const large = prepareSearch(
  Array.from({ length: 6000 }, (_, i): IconEntry => {
    const name = `${words[i % words.length]}-${words[(i * 7) % words.length]}-${String(i % 50).padStart(2, "0")}`;
    return { name, exportName: name, tags: [words[(i * 3) % words.length], "shape"], categories: ["test"], file: "" };
  }),
);

const names = (icons: { name: string }[], count = 5) => icons.slice(0, count).map((icon) => icon.name);

describe("queryTerms", () => {
  it("drops filler words unless nothing else is left", () => {
    expect(queryTerms("Icon for a Ticket")).toEqual(["ticket"]);
    expect(queryTerms("the")).toEqual(["the"]);
    expect(normalizePhrase("  Person   waving-goodbye ")).toBe("person waving goodbye");
  });
});

describe("keywordSearch", () => {
  it("puts the exact name first", () => {
    expect(keywordSearch(lucide, "ticket")[0].name).toBe("ticket");
    expect(keywordSearch(huge, "ticket 01")[0].name).toBe("ticket-01");
    expect(names(keywordSearch(huge, "ticket"))).toEqual(expect.arrayContaining(["ticket-01"]));
  });

  it("puts numbered variants of the exact name next, ahead of other words", () => {
    expect(names(keywordSearch(huge, "ticket"), 3)).toEqual(["ticket-01", "ticket-02", "ticket-03"]);
    expect(names(keywordSearch(huge, "ticket x"), 1)).toEqual(["ticket-x"]);
  });

  it("requires every word to match somewhere", () => {
    const results = keywordSearch(lucide, "arrow down");
    expect(results.length).toBeGreaterThan(0);
    for (const icon of results)
      expect(icon.name.includes("arrow") || icon.tags.some((tag) => tag.includes("arrow"))).toBe(true);
    expect(keywordSearch(lucide, "ticket zzqx")).toEqual([]);
  });

  it("matches tags and multi-word tag phrases", () => {
    expect(names(keywordSearch(huge, "happy face"), 10)).toContain("smile-dizzy");
    expect(keywordSearch(lucide, "parentheses").length).toBeGreaterThan(0);
  });

  it("finds an icon by a saved keyword", () => {
    expect(keywordSearch(lucide, "person waving goodbye")).toEqual([]);
    const found = keywordSearch(lucide, "person waving goodbye", { hand: ["person waving goodbye"] });
    expect(names(found, 1)).toEqual(["hand"]);
  });

  it("returns nothing for an empty query", () => {
    expect(keywordSearch(lucide, "   ")).toEqual([]);
  });
});

describe("aiRank", () => {
  it("ranks icons by how many suggested keywords they answer", () => {
    const results = aiRank(lucide, ["wave", "hand", "goodbye", "greeting", "farewell"], 10);
    expect(results.length).toBeGreaterThan(0);
    expect(names(results, 10)).toContain("hand");
  });

  // Real Lucide tags (lucide.dev, 2026-11-09) and an AI keyword list for "happy face". Before the relevance
  // cutoff, AI Results showed an angry face, plus signs, rss and a joystick: each answered one generic word.
  const happyFace = prepareSearch(
    (
      [
        ["face-grinning", ["smile", "happy", "grin", "emoji", "laugh", "emotion"]],
        ["face-slightly-smiling", ["smile", "happy", "happiness", "good", "positive", "friendly", "emoji", "emotion"]],
        ["sticker", ["reaction", "emotion", "smile", "happy", "feedback"]],
        ["face-angry", ["anger", "rage", "fury", "emoji", "emotion"]],
        ["face-slightly-frowning", ["emoji", "bad", "sadness", "emotion"]],
        ["plus", ["add", "new", "create", "increase", "positive", "calculate"]],
        ["rss", ["feed", "subscribe", "news", "updates", "notifications", "content"]],
        ["joystick", ["game", "console", "control stick"]],
      ] as const
    ).map(([name, tags]): IconEntry => ({ name, exportName: name, tags: [...tags], categories: [], file: "" })),
  );
  const happyKeywords = ["smile", "happy", "joy", "grin", "smiley face", "emoji", "laugh", "cheerful", "positive", "content"];

  it("drops icons that only answer one loose keyword, far below the best match", () => {
    const results = names(aiRank(happyFace, happyKeywords), 10);
    expect(results).toEqual(["face-grinning", "face-slightly-smiling", "sticker"]);
  });

  it("keeps every icon when they all answer equally well", () => {
    expect(aiRank(happyFace, ["emoji"]).map((icon) => icon.name)).toEqual(
      expect.arrayContaining(["face-grinning", "face-angry", "face-slightly-frowning"]),
    );
  });

  it("matches a keyword as the start of a word only from four letters", () => {
    expect(aiRank(happyFace, ["joy"])).toEqual([]);
    expect(names(aiRank(happyFace, ["grin"]))).toEqual(["face-grinning"]);
  });

  it("caps results and ignores empty keyword lists", () => {
    expect(aiRank(large, ["arrow"], 7)).toHaveLength(7);
    expect(aiRank(huge, [])).toEqual([]);
  });

  it("is quick enough to run on every keystroke", () => {
    const started = performance.now();
    for (const query of ["t", "ti", "tic", "tick", "ticke", "ticket"]) keywordSearch(large, query);
    expect((performance.now() - started) / 6).toBeLessThan(50);
  });
});
