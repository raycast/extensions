import { describe, expect, it } from "vitest";

import { renderStandaloneRow } from "@/core/content/render";
import { getStrokeOrderCharacters } from "@/core/stroke-order/characters";

import { decodeFavoriteSnapshot, decodeLegacyFavorites } from "./decode";
import { resolveFavoriteTranslations } from "./model";
import { favoriteMarkdown, getFavoriteView } from "./view";

const query = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
const oldRow = {
  queryType: "Youdao Dictionary",
  displayType: "Translation",
  queryWordInfo: query,
  key: "old-row-key",
  title: "你好",
  subtitle: "hello",
  copyText: "你好",
  fromCache: true,
};
const oldFavorite = { ...query, createdAt: 1, displaySections: [] };

function migrate(displaySections: unknown[], extra: Record<string, unknown> = {}) {
  return decodeLegacyFavorites([{ ...oldFavorite, displaySections, ...extra }])[0];
}

describe("legacy favorite content", () => {
  it("keeps old AI bodies and skips Linguee placeholders when deriving the saved preview", () => {
    const favorite = migrate([
      {
        type: "Translation",
        items: [{ ...oldRow, queryType: "Linguee Dictionary", title: "hello", copyText: "hello hello" }],
      },
      {
        type: "Definition",
        items: [
          {
            ...oldRow,
            queryType: "AI Dictionary",
            displayType: "Definition",
            detailsMarkdown: "### 你好\n\nA greeting",
          },
        ],
      },
    ]);
    const restored = decodeFavoriteSnapshot(JSON.parse(JSON.stringify(favorite)));
    expect(resolveFavoriteTranslations(restored)).toBeUndefined();
    expect(favoriteMarkdown(restored)).toContain("<small>1.</small> **你好**\n\nA greeting");
    expect(favoriteMarkdown(restored)).not.toContain("### 你好");
    const withTranslation = migrate([
      { type: "Translation", items: [{ ...oldRow, queryType: "Linguee Dictionary", title: "hello" }] },
      { type: "Translation", items: [oldRow] },
    ]);
    expect(resolveFavoriteTranslations(withTranslation)).toEqual(["你好"]);
    expect(
      getStrokeOrderCharacters({
        ...query,
        sourceText: query.word,
        translatedText: resolveFavoriteTranslations(withTranslation)?.join("\n") ?? "",
      }),
    ).toEqual(["你", "好"]);
  });

  it("preserves explicit previews even without body sections, and empty previews still derive", () => {
    expect(resolveFavoriteTranslations(migrate([], { translations: ["original", "preview"] }))).toEqual([
      "original",
      "preview",
    ]);
    expect(
      resolveFavoriteTranslations(migrate([{ type: "Translation", items: [oldRow] }], { translations: ["original"] })),
    ).toEqual(["original"]);
    expect(
      resolveFavoriteTranslations(migrate([{ type: "Translation", items: [oldRow] }], { translations: [] })),
    ).toEqual(["你好"]);
    expect(
      resolveFavoriteTranslations(
        migrate([{ type: "Translation", items: [{ ...oldRow, queryType: "AI Dictionary", title: "hello" }] }]),
      ),
    ).toEqual(["hello"]);
  });

  it.each([false, true])(
    "keeps the first translation section rule without promoting later translations (empty section: %s)",
    (emptySection) => {
      const first = { ...oldRow, displayType: undefined, queryType: "Bing Translate", title: "", copyText: "" };
      const favorite = migrate([
        { type: "Bing Translate", items: emptySection ? [] : [first] },
        {
          type: "Google Translate",
          items: [{ ...first, queryType: "Google Translate", title: "second", copyText: "second" }],
        },
        { type: "Translation", items: [oldRow] },
      ]);
      expect(resolveFavoriteTranslations(favorite)).toEqual(["你好"]);
    },
  );

  it("discards translation comparison pages while retaining paragraphs, labels and mixed service order", () => {
    const translation = (label: string, toLanguage: string, copyText: string) => ({
      type: "OpenAI Translate",
      serviceId: label,
      items: [
        {
          ...oldRow,
          displayType: undefined,
          queryType: "OpenAI Translate",
          serviceId: label,
          serviceLabel: label,
          queryWordInfo: { ...query, toLanguage },
          copyText,
          detailsMarkdown: "DISCARD COMPARISON",
          showMoreDetailsMarkdown: "DISCARD PAGE",
        },
      ],
    });
    const favorite = migrate([
      translation("First", "fr", "first paragraph\n\nsecond paragraph"),
      { type: "Translation", items: [oldRow] },
      translation("Second", "zh-CHS", "第二"),
      translation("Third", "zh-CHS", "第三"),
    ]);
    const serialized = JSON.stringify(favorite);
    expect(serialized).not.toContain("DISCARD");
    expect(serialized).not.toContain("old-row-key");
    expect(serialized).not.toContain("fromCache");
    const markdown = favoriteMarkdown(decodeFavoriteSnapshot(JSON.parse(serialized)));
    expect(markdown).toContain("First · English → French");
    expect(markdown).toContain("first paragraph\n\nsecond paragraph");
    expect(markdown.indexOf("First")).toBeLessThan(markdown.indexOf("Youdao Dictionary"));
    expect(markdown.indexOf("Youdao Dictionary")).toBeLessThan(markdown.indexOf("Second"));
    expect(markdown.match(/<table>/g)).toHaveLength(1);
    expect(resolveFavoriteTranslations(favorite)).toEqual(["first paragraph", "second paragraph"]);
  });

  it("keeps complete machine-translation bodies inside a mixed dictionary service group", () => {
    const favorite = migrate([
      {
        type: "Bing Translate",
        serviceId: "shared",
        sectionTitle: "Machine section must stay untitled",
        items: [
          {
            ...oldRow,
            displayType: undefined,
            queryType: "Bing Translate",
            serviceLabel: "Shared service",
            title: "Only a list preview",
            copyText: "Complete first paragraph\n\nComplete second paragraph",
            detailsMarkdown: "Unused comparison page",
          },
        ],
      },
      {
        type: "Definition",
        serviceId: "shared",
        items: [
          {
            ...oldRow,
            queryType: "AI Dictionary",
            displayType: "Definition",
            detailsMarkdown: "A dictionary definition",
          },
        ],
      },
    ]);
    const restored = decodeFavoriteSnapshot(JSON.parse(JSON.stringify(favorite)));
    expect(restored.services).toHaveLength(1);
    const markdown = favoriteMarkdown(restored);
    expect(markdown).toContain("Complete first paragraph\n\nComplete second paragraph");
    expect(markdown).not.toContain("Only a list preview");
    expect(markdown).not.toContain("Machine section must stay untitled");
    expect(markdown).not.toContain("Unused comparison page");
    expect(markdown.match(/Shared service/g)).toHaveLength(1);
    expect(markdown.indexOf("Complete second paragraph")).toBeLessThan(markdown.indexOf("A dictionary definition"));
    expect(markdown).toContain("<small>1.</small> A dictionary definition");
  });

  it("retains per-row query replacements, accessory pronunciation and the original audio source", () => {
    const firstQuery = { ...query, phonetic: "query-only", speechUrl: "https://audio.test/first", examTypes: ["CET4"] };
    const nextQuery = { ...query, toLanguage: "fr", speechUrl: "https://audio.test/second" };
    const favorite = migrate([
      {
        type: "Translation",
        items: [
          { ...oldRow, queryWordInfo: firstQuery, accessoryItem: { phonetic: "accessory-first" } },
          { ...oldRow, title: "bonjour", queryWordInfo: nextQuery, accessoryItem: { phonetic: "accessory-second" } },
        ],
      },
    ]);
    expect(favorite.query).toMatchObject({ ...query, speechUrl: "https://audio.test/first" });
    expect(favorite.query.phonetic).toBe("accessory-first");
    const rows = getFavoriteView(decodeFavoriteSnapshot(JSON.parse(JSON.stringify(favorite))))[0].items;
    expect(rows[0].service.query.phonetic).toBe("query-only");
    expect(rows[1].service.query).toMatchObject(nextQuery);
    expect(rows[1].service.query.phonetic).toBeUndefined();
    expect(rows[1].service.query.examTypes).toBeUndefined();
    expect(renderStandaloneRow(rows[1])).toContain("English → French");
    expect(favoriteMarkdown(favorite)).toContain("\\text{accessory-first}");
    expect(favoriteMarkdown(favorite)).not.toContain("query-only");
  });

  it("renders migrated Forms pairs without a header and preserves section-owned numbering", () => {
    const favorite = migrate([
      {
        type: "Forms",
        items: [
          {
            ...oldRow,
            queryType: "Linguee Dictionary",
            displayType: "Forms",
            title: "hello",
            subtitle: "greeting",
            detailsMarkdown: "unused pair body",
          },
        ],
      },
      { type: "Definition", items: [{ ...oldRow, queryType: "AI Dictionary", displayType: "Translation" }] },
    ]);
    const restored = decodeFavoriteSnapshot(JSON.parse(JSON.stringify(favorite)));
    const markdown = favoriteMarkdown(restored);
    expect(markdown).toContain("<th>Form</th><th>Value</th>");
    expect(markdown).toContain("<td>hello</td><td>greeting</td>");
    expect(markdown).toContain("<small>1.</small> **你好**");
    expect(JSON.stringify(restored)).not.toContain("unused pair body");
  });

  it.each([undefined, "", "explicit pronunciation"])(
    "preserves header pronunciation before grouping nonadjacent sections (top pronunciation: %s)",
    (phonetic) => {
      const favorite = migrate(
        [
          { type: "Translation", serviceId: "a", items: [oldRow] },
          {
            type: "Translation",
            serviceId: "b",
            items: [{ ...oldRow, accessoryItem: { phonetic: "first pronunciation" } }],
          },
          {
            type: "Explanation",
            serviceId: "a",
            items: [
              {
                ...oldRow,
                displayType: "Explanation",
                accessoryItem: { phonetic: "later pronunciation" },
                detailsMarkdown: "A definition",
              },
            ],
          },
        ],
        { phonetic },
      );
      expect(favorite.query.phonetic).toBe(phonetic ?? "first pronunciation");
      if (phonetic !== "")
        expect(favoriteMarkdown(favorite).split("\n\n")[0]).toContain(phonetic ?? "first pronunciation");
      expect(favoriteMarkdown(favorite).split("\n\n")[0]).not.toContain("later pronunciation");
    },
  );

  it("keeps Chinese and encyclopedia bodies that cannot be reconstructed from copy text", () => {
    const favorite = migrate([
      {
        type: "Modern Chinese Dict",
        items: [
          {
            ...oldRow,
            displayType: "Modern Chinese Dict",
            title: "nǐ hǎo",
            subtitle: "问候",
            copyText: "nǐ hǎo  问候",
            detailsMarkdown: "### nǐ hǎo\n\n1. 问候：`你好！`",
          },
        ],
      },
      {
        type: "Baike",
        items: [
          {
            ...oldRow,
            displayType: "Baike",
            title: "你好",
            subtitle: "你好是问候语",
            copyText: "你好 你好是问候语",
            detailsMarkdown: "你好是问候语",
          },
        ],
      },
      {
        type: "Forms and Tenses",
        items: [
          {
            ...oldRow,
            displayType: "Forms and Tenses",
            title: "",
            subtitle: " [ plural: hellos ]",
            copyText: "plural: hellos",
            detailsMarkdown: " [ plural: hellos ]",
          },
        ],
      },
    ]);
    const restored = decodeFavoriteSnapshot(JSON.parse(JSON.stringify(favorite)));
    const markdown = favoriteMarkdown(restored);
    expect(markdown).toContain("### nǐ hǎo\n\n1. 问候：`你好！`");
    expect(markdown).toContain("你好是问候语");
    expect(markdown).not.toContain("你好 你好是问候语");
    expect(markdown).toContain(" [ plural: hellos ]");
    expect(getFavoriteView(restored)[2].items[0].copyText).toBe("plural: hellos");
  });
});
