/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { describe, expect, it, vi } from "vitest";

import { YoudaoDictionaryListItemType } from "@/providers/dictionary/youdao/types";
import { DictionaryType, TranslationType } from "@/types/api";
import type { ListDisplayItem } from "@/types/display";

import {
  resultHeader,
  resultItemBody,
  savedResultMarkdown,
  standaloneResultMarkdown,
  translationResultsMarkdown,
} from "./resultMarkdown";

vi.mock("@/utils/appearance", () => ({ isDarkAppearance: () => false }));

vi.mock("@/core/language/utils", () => ({
  getLanguageItem: (code: string) => ({
    langEnglishName: { en: "English", "zh-CHS": "Chinese-Simplified", fr: "French" }[code] ?? code,
  }),
}));

const info = { word: "testimony", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
function dictionaryItem(
  overrides: Partial<Extract<ListDisplayItem, { queryType: DictionaryType.Youdao }>> = {},
): ListDisplayItem & { showMoreDetailsMarkdown: string } {
  return {
    queryType: DictionaryType.Youdao,
    displayType: YoudaoDictionaryListItemType.Translation,
    queryWordInfo: info,
    serviceId: "youdao",
    serviceLabel: "Youdao Dictionary",
    key: "translation",
    title: "证词",
    subtitle: "testimony",
    copyText: "证词",
    detailsMarkdown: "证词 testimony",
    showMoreDetailsMarkdown: "## Youdao Dictionary (English → Chinese-Simplified)\n### testimony\n证词 testimony",
    ...overrides,
  };
}

describe("result reading layouts", () => {
  it("escapes short headwords in the shared SVG header and keeps long headwords as wrapping text", () => {
    const markdown = resultHeader({ ...info, word: "<b>x" });
    const encoded = markdown.match(/base64,([^)]*)/);
    expect(encoded).not.toBeNull();
    const svg = Buffer.from(encoded![1], "base64").toString("utf8");
    expect(svg).toContain("&lt;b&gt;x");
    expect(svg).not.toContain("<b>");
    expect(svg.match(/y="30"/g)).toHaveLength(2);
    const longWord = "W".repeat(30);
    expect(resultHeader({ ...info, word: longWord })).toContain(`## ${longWord}`);
    expect(resultHeader({ ...info, word: longWord })).not.toContain("data:image");
  });

  it("renders old saved word sections once per service without repeating standalone headers or the source subtitle", () => {
    const translation = dictionaryItem();
    const definition = dictionaryItem({
      displayType: YoudaoDictionaryListItemType.Explanation,
      title: "n.",
      detailsMarkdown: "n. 证词；证言",
      copyText: "n. 证词；证言",
    });
    const markdown = savedResultMarkdown(info, [
      { type: YoudaoDictionaryListItemType.Translation, items: [translation] },
      { type: YoudaoDictionaryListItemType.Explanation, sectionTitle: "Details", items: [definition] },
    ]);
    expect(markdown.match(/testimony/g)).toHaveLength(1);
    expect(markdown.match(/Youdao Dictionary/g)).toHaveLength(1);
    expect(markdown.match(/English/g)).toHaveLength(1);
    expect(markdown).toContain("n. 证词；证言");
    expect(markdown).not.toContain("证词 testimony");
    expect(standaloneResultMarkdown(translation)).not.toContain("证词 testimony");
  });

  it("places pronunciation once in the word header and numbers saved definitions without native list sizing", () => {
    const translation = dictionaryItem({ accessoryItem: { phonetic: "/ɡʊd/" } });
    const definition = dictionaryItem({
      displayType: YoudaoDictionaryListItemType.Explanation,
      detailsMarkdown: "n. 证词；证言",
    });
    const markdown = savedResultMarkdown(info, [
      { type: YoudaoDictionaryListItemType.Translation, items: [translation] },
      { type: YoudaoDictionaryListItemType.Explanation, items: [definition] },
    ]);
    expect(markdown.match(/ɡʊd/g)).toHaveLength(1);
    expect(markdown).toContain("<small>1.</small> n. 证词；证言");
    expect(markdown).not.toContain("### Youdao Dictionary");
  });

  it("escapes provider content in short paired tables in both live and saved views", () => {
    const phrase = dictionaryItem({
      displayType: YoudaoDictionaryListItemType.WebPhrase,
      title: "<script>",
      subtitle: "A & B",
    });
    const body = resultItemBody(phrase);
    expect(body).toContain("<table>");
    expect(body).toContain("&lt;script&gt;");
    expect(body).toContain("A &amp; B");
    expect(savedResultMarkdown(info, [{ type: YoudaoDictionaryListItemType.WebPhrase, items: [phrase] }])).toContain(
      "&lt;script&gt;",
    );
  });

  it("keeps sentence paragraphs and multiline source text outside headings and tables", () => {
    const sentence = { ...info, word: "First line\nSecond line", isWord: false };
    const markdown = standaloneResultMarkdown({
      queryType: TranslationType.Google,
      queryWordInfo: sentence,
      serviceLabel: "Google",
      key: "google",
      title: "第一段",
      copyText: "第一段\n\n第二段",
    });
    expect(markdown).toContain("> First line  \n> Second line");
    expect(markdown).toContain("第一段\n\n第二段");
    expect(markdown).not.toContain("##");
    expect(markdown).not.toContain("<table>");
  });

  it("omits the source text from live translation previews while retaining it in saved results", () => {
    const sentence = { ...info, word: "Source sentence already in the search field", isWord: false };
    const item = {
      queryType: TranslationType.Google,
      queryWordInfo: sentence,
      serviceLabel: "Google",
      key: "google",
      title: "译文",
      copyText: "译文",
    } satisfies ListDisplayItem;
    const preview = translationResultsMarkdown(sentence, [{ label: "Google", text: item.copyText, info: sentence }]);
    expect(preview).not.toContain(sentence.word);
    expect(preview).toContain("译文");
    expect(savedResultMarkdown(sentence, [{ type: TranslationType.Google, items: [item] }])).toContain(sentence.word);
  });

  it("uses compact word comparison tables while identifying a different translation direction", () => {
    const markdown = translationResultsMarkdown(info, [
      { label: "Profile A", text: "证词", info },
      { label: "Profile B", text: "témoignage", info: { ...info, toLanguage: "fr" } },
    ]);
    expect(markdown).toContain("<table>");
    expect(markdown).toContain("Profile A");
    expect(markdown).toContain("Profile B · English → French");
  });

  it("keeps separately configured services and ignores aggregate previews stored in translation items", () => {
    const sections = ["first", "second"].map((serviceId) => ({
      serviceId,
      type: TranslationType.OpenAI,
      items: [
        {
          queryType: TranslationType.OpenAI,
          serviceId,
          serviceLabel: serviceId,
          queryWordInfo: info,
          key: serviceId,
          title: "证词",
          copyText: "证词",
          detailsMarkdown: "ALL SERVICES REPEATED",
          showMoreDetailsMarkdown: "OLD WRAPPER",
        } satisfies ListDisplayItem & { showMoreDetailsMarkdown: string },
      ],
    }));
    const markdown = savedResultMarkdown(info, sections);
    expect(markdown).toContain("first");
    expect(markdown).toContain("second");
    expect(markdown).not.toContain("ALL SERVICES REPEATED");
    expect(markdown).not.toContain("OLD WRAPPER");
  });
  it("compacts adjacent translation services in mixed favorites without moving them across dictionary sections", () => {
    const translationSection = (label: string) => ({
      type: TranslationType.Google,
      serviceId: label,
      items: [
        {
          queryType: TranslationType.Google,
          serviceId: label,
          serviceLabel: label,
          queryWordInfo: info,
          key: label,
          title: "证词",
          copyText: "证词",
        } satisfies ListDisplayItem,
      ],
    });
    const markdown = savedResultMarkdown(info, [
      translationSection("First"),
      { type: YoudaoDictionaryListItemType.Translation, items: [dictionaryItem()] },
      translationSection("Second"),
      translationSection("Third"),
    ]);
    expect(markdown.indexOf("First")).toBeLessThan(markdown.indexOf("Youdao Dictionary"));
    expect(markdown.indexOf("Youdao Dictionary")).toBeLessThan(markdown.indexOf("Second"));
    expect(markdown.match(/<table>/g)).toHaveLength(1);
    expect(markdown).toContain("<th>Service</th>");
    expect(markdown.match(/testimony/g)).toHaveLength(1);
  });
});
