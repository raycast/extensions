import { describe, expect, it } from "vitest";

import type { ContentEquivalent } from "@/core/content/types";
import { buildContentView } from "@/core/content/view";
import type { ViewSection } from "@/core/content/viewTypes";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryWordInfo } from "@/core/results/types";

import { buildLingueeContent } from "./content";
import type { LingueeDictionaryResult, LingueeWordItem } from "./types";

const queryWordInfo: QueryWordInfo = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };

describe("Linguee content reading contract", () => {
  it("does not create a Translation section when the first translation is blank", () => {
    const sections = buildSections(
      createResult({
        wordItems: [createWordItem({ entries: [createExplanation("   ")] })],
        examples: [createExample()],
      }),
    );

    expect(sections.some((section) => section.kind === "translation")).toBe(false);
  });

  it("preserves headword punctuation, featured notes, and the last unfeatured entry's classification", () => {
    const sections = buildSections(
      createResult({
        wordItems: [
          createWordItem({
            pos: "adj",
            placeholder: "sth.",
            entries: [
              createExplanation("良好的", {
                partOfSpeech: "adj",
                inflectionNote: "unused common note",
                firstExampleTranslation: "一本好书",
              }),
              createExplanation("适宜", { prominent: false, partOfSpeech: "adj" }),
              createExplanation("优秀的", {
                partOfSpeech: "adj",
                inflectionNote: "(often used)",
                frequency: "often",
              }),
              createExplanation("bon", {
                partOfSpeech: "adj",
                inflectionNote: "(bonne f sl)",
                frequency: "special-forms",
              }),
              createExplanation("有益", {
                prominent: false,
                partOfSpeech: "v",
                frequency: "less-common",
              }),
            ],
          }),
          createWordItem({
            word: "goods",
            pos: "n",
            placeholder: "(plural)",
            entries: [
              createExplanation("商品", {
                prominent: false,
                partOfSpeech: "adj",
                frequency: "less-common",
              }),
              createExplanation("货物", { prominent: false, partOfSpeech: "n" }),
            ],
          }),
        ],
      }),
    );

    expect(readingSections(sections)).toEqual([
      {
        heading: "Linguee Dictionary   (English --> Chinese-Simplified)",
        items: [{ tooltip: "Translation", title: "良好的", subtitle: "good", copy: "良好的 good", body: "**良好的**" }],
      },
      {
        heading: "good sth.  adj",
        items: [
          {
            tooltip: "Common",
            title: "良好的",
            subtitle: "adj.       一本好书",
            copy: "良好的 adj.       一本好书",
            body: "良好的 adj.       一本好书",
          },
          {
            tooltip: "Often Used",
            title: "优秀的",
            subtitle: "adj.  (often used)       ",
            copy: "优秀的 adj.  (often used)       ",
            body: "优秀的 adj.  (often used)       ",
          },
          {
            tooltip: "Forms",
            title: "bon",
            subtitle: "adj.  (bonne f sl)       ",
            copy: "bon adj.  (bonne f sl)       ",
            body: "<table>\n<tr><td>bon</td><td>adj.  (bonne f sl)       </td></tr>\n</table>",
          },
          {
            tooltip: "Less Common",
            title: "v.",
            subtitle: "适宜;  有益  (less common)",
            copy: "v. 适宜;  有益  (less common)",
            body: "v. 适宜;  有益  (less common)",
          },
        ],
      },
      {
        heading: "goods (plural).n",
        items: [
          {
            tooltip: "Unfeatured",
            title: "n.",
            subtitle: "商品;  货物  ",
            copy: "n. 商品;  货物  ",
            body: "n. 商品;  货物  ",
          },
        ],
      },
    ]);
  });

  it("limits examples and related words to three while keeping every encyclopedia summary in the title", () => {
    const sections = buildSections(
      createResult({
        examples: [
          {
            sentence: "good news",
            partOfSpeech: "n",
            translation: "好消息;  佳音",
          },
          createExample(),
          { sentence: "do good", partOfSpeech: "v", translation: "行善" },
          { sentence: "omitted example", translation: "不会显示" },
        ],
        relatedWords: [
          { expression: "goodness", partOfSpeech: "n", meaning: "善良;  美德" },
          { expression: "goodwill", partOfSpeech: "", meaning: "善意" },
          { expression: "good luck", partOfSpeech: "", meaning: "好运" },
          { expression: "omitted word", partOfSpeech: "", meaning: "不会显示" },
        ],
        wikipedias: [
          { subject: "Good", text: "An ethical concept." },
          { subject: "Goods", text: "Items for sale." },
        ],
      }),
    );

    expect(readingSections(sections)).toEqual([
      {
        heading: "Linguee Dictionary   (English --> Chinese-Simplified)",
        items: [
          {
            tooltip: "Example",
            title: "good news",
            subtitle: "n.  —  好消息;  佳音",
            copy: "good news n.  —  好消息;  佳音",
            body: "- **good news**  \n  n\\.  —  好消息;  佳音",
          },
          {
            tooltip: "Example",
            title: "a good book",
            subtitle: "—  一本好书",
            copy: "a good book —  一本好书",
            body: "- **a good book**  \n  —  一本好书",
          },
          {
            tooltip: "Example",
            title: "do good",
            subtitle: "v.  —  行善",
            copy: "do good v.  —  行善",
            body: "- **do good**  \n  v\\.  —  行善",
          },
        ],
      },
      {
        heading: "Related words:",
        items: [
          {
            tooltip: "Related word",
            title: "goodness",
            subtitle: "n.  善良;  美德",
            copy: "goodness n.  善良;  美德",
            body: "<table>\n<tr><td>goodness</td><td>n.  善良;  美德</td></tr>\n</table>",
          },
          {
            tooltip: "Related word",
            title: "goodwill",
            subtitle: "善意",
            copy: "goodwill 善意",
            body: "<table>\n<tr><td>goodwill</td><td>善意</td></tr>\n</table>",
          },
          {
            tooltip: "Related word",
            title: "good luck",
            subtitle: "好运",
            copy: "good luck 好运",
            body: "<table>\n<tr><td>good luck</td><td>好运</td></tr>\n</table>",
          },
        ],
      },
      {
        heading: "Wikipedia",
        items: [
          {
            tooltip: "Wikipedia",
            title: "Good An ethical concept.",
            subtitle: "",
            copy: "Good An ethical concept. ",
            body: "Good An ethical concept. ",
          },
          {
            tooltip: "Wikipedia",
            title: "Goods Items for sale.",
            subtitle: "",
            copy: "Goods Items for sale. ",
            body: "Goods Items for sale. ",
          },
        ],
      },
    ]);
  });
});

function buildSections(result: LingueeDictionaryResult) {
  return buildContentView(
    {
      services: [
        {
          type: DictionaryType.Linguee,
          serviceId: "linguee",
          serviceLabel: "Linguee Dictionary",
          serviceOrder: 0,
          content: buildLingueeContent(queryWordInfo, { queryWordInfo, result }),
        },
      ],
      isShowDetail: false,
    },
    true,
  );
}

function readingSections(sections: ViewSection[]) {
  return sections.map((section) => ({
    heading: section.title,
    items: section.items.map((item) => ({
      tooltip: item.tooltip,
      title: item.title,
      subtitle: item.subtitle,
      copy: item.copyText,
      body: item.renderBody(),
    })),
  }));
}

function createResult(overrides: Partial<LingueeDictionaryResult> = {}): LingueeDictionaryResult {
  return {
    wordItems: [],
    examples: [],
    relatedWords: [],
    wikipedias: [],
    ...overrides,
  };
}

function createExample() {
  return {
    sentence: "a good book",
    translation: "一本好书",
  };
}

function createWordItem(overrides: Partial<LingueeWordItem> = {}): LingueeWordItem {
  return {
    word: "good",
    pos: "",
    placeholder: "",
    entries: [createExplanation("良好的")],
    ...overrides,
  };
}

function createExplanation(text: string, overrides: Partial<ContentEquivalent> = {}): ContentEquivalent {
  return {
    prominent: true,
    text,
    frequency: "common",
    ...overrides,
  };
}
