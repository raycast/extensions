import { describe, expect, it } from "vitest";

import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { QueryWordInfo } from "@/core/results/types";

import type { ComposedService } from "./compose";
import { renderSavedView, renderSelectedRow, renderStandaloneRow } from "./render";
import type { DictionarySection } from "./types";
import { buildContentView } from "./view";

const query = { word: "testimony", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
function translation(serviceId: string, paragraphs: readonly string[], info: QueryWordInfo = query): ComposedService {
  return {
    type: TranslationType.OpenAI,
    serviceId,
    serviceLabel: serviceId,
    serviceOrder: 0,
    content: { kind: "translation", query: info, paragraphs },
  };
}
function dictionary(
  sections: readonly DictionarySection[],
  info: QueryWordInfo = query,
  type = DictionaryType.Youdao,
): ComposedService {
  return {
    type,
    serviceId: "dictionary",
    serviceLabel: "Youdao Dictionary",
    serviceOrder: 1,
    content: { kind: "dictionary", query: info, sections },
  };
}
function view(...services: ComposedService[]) {
  return buildContentView({ services, isShowDetail: false }, true);
}

describe("content rendering", () => {
  it("renders the headword as serif math letters with an inline gray pronunciation and keeps the direction for standalone details", () => {
    const info = { ...query, phonetic: "/ˈtestɪmoʊni/" };
    const sections = view(dictionary([{ kind: "translation", text: "证词" }], info));

    const standalone = renderStandaloneRow(sections[0].items[0]);
    const saved = renderSavedView(info, sections);
    for (const markdown of [standalone, saved]) {
      expect(markdown).toContain("## 𝐭𝐞𝐬𝐭𝐢𝐦𝐨𝐧𝐲 \\({\\small\\textcolor{gray}{\\text{/ˈtestɪmoʊni/}}}\\)");
      expect(markdown).toContain("**证词**");
      expect(markdown).not.toContain("## testimony");
    }
    expect(standalone).toContain("English → Chinese\\-Simplified");
    expect(saved).not.toContain("English → Chinese\\-Simplified");
  });

  it("keeps non-ASCII headwords on the native heading and escapes markdown in math-letter words", () => {
    const [nonAscii] = view(translation("One", ["translation"], { ...query, word: "你好" }));
    expect(renderStandaloneRow(nonAscii.items[0])).toContain("## 你好");

    const [symbols] = view(translation("One", ["translation"], { ...query, word: "C#_100%" }));
    expect(renderStandaloneRow(symbols.items[0])).toContain("## 𝐂\\#\\_𝟏𝟎𝟎%");
  });

  it("moves a long pronunciation to its own wrapping line", () => {
    const phonetic = "a".repeat(80);
    const [section] = view(translation("One", ["translation"], { ...query, word: "good", phonetic }));
    const markdown = renderStandaloneRow(section.items[0]);
    expect(markdown).toContain("## 𝐠𝐨𝐨𝐝");
    expect(markdown).not.toContain("\\text{");
    expect(markdown).toContain(`\n\n${phonetic}\n\nEnglish → Chinese\\-Simplified`);
  });

  it("keeps a long pronunciation in the KaTeX span while it still fits one line", () => {
    const phonetic = "/ˌæntiˌdɪsɪˌstæblɪʃmənˈteəriənɪzəm/";
    const [section] = view(
      translation("One", ["translation"], { ...query, word: "antidisestablishmentarianism", phonetic }),
    );
    const markdown = renderStandaloneRow(section.items[0]);
    expect(markdown).toContain(`\\text{${phonetic}}`);
    expect(markdown).not.toContain(`\n\n${phonetic}`);
  });

  it("compares visible profiles with the selected service first and marks differing language directions", () => {
    const sections = view(
      translation("One", ["证词"]),
      translation("Two", ["témoignage"], { ...query, toLanguage: "fr" }),
    );
    const markdown = renderSelectedRow(sections[1].items[0], sections);
    expect(markdown).toContain("<table>");
    expect(markdown).toContain("<th>Service</th><th>Translation</th>");
    expect(markdown).toContain("One · English → Chinese-Simplified");
    expect(markdown.indexOf("Two")).toBeLessThan(markdown.indexOf("One"));
    expect(markdown).not.toContain(query.word);
    expect(sections.map((section) => section.service.serviceId)).toEqual(["One", "Two"]);
  });

  it("uses a dictionary translation's own body instead of the neighboring machine comparison", () => {
    const sections = view(translation("One", ["machine text"]), dictionary([{ kind: "translation", text: "证词" }]));
    expect(renderSelectedRow(sections[1].items[0], sections)).toBe("**证词**");
    expect(renderStandaloneRow(sections[1].items[0])).toContain("<small>Youdao Dictionary</small>\n\n**证词**");
    expect(renderStandaloneRow(sections[1].items[0])).not.toContain("machine text");
  });

  it("renders the shared word header once and numbers definitions without repeating the source subtitle", () => {
    const sections = view(
      dictionary(
        [
          { kind: "translation", text: "证词" },
          {
            kind: "definitions",
            entries: [
              { kind: "plain", text: "n. 证词；证言" },
              { kind: "plain", text: "evidence" },
            ],
          },
        ],
        { ...query, phonetic: "/ɡʊd/" },
      ),
    );
    const markdown = renderSavedView(query, sections);
    expect(markdown.match(/𝐭𝐞𝐬𝐭𝐢𝐦𝐨𝐧𝐲/g)).toHaveLength(1);
    expect(markdown).not.toContain("testimony");
    expect(markdown.match(/Youdao Dictionary/g)).toHaveLength(1);
    expect(markdown.match(/ɡʊd/g)).toHaveLength(1);
    expect(markdown).toContain("<small>1.</small> n. 证词；证言");
    expect(markdown).toContain("<small>2.</small> evidence");
    expect(markdown).not.toContain("证词 testimony");
  });

  it("escapes and combines short pairs into one saved table while retaining long prose bodies", () => {
    const sections = view(
      dictionary([
        {
          kind: "pairs",
          relation: "phrase",
          entries: [
            { expression: "<script>", meaning: "A & B" },
            { expression: "next", meaning: "meaning" },
          ],
        },
      ]),
    );
    expect(sections[0].items[0].renderBody()).toBe(
      "<table>\n<tr><td>&lt;script&gt;</td><td>A &amp; B</td></tr>\n</table>",
    );
    const saved = renderSavedView(query, sections);
    expect(saved.match(/<table>/g)).toHaveLength(1);
    expect(saved).toContain("<th>Expression</th><th>Meaning</th>");
    expect(saved).toContain("<td>next</td><td>meaning</td>");
    const long = "a".repeat(121);
    const longSections = view(
      dictionary([{ kind: "pairs", relation: "phrase", entries: [{ expression: "term", meaning: long }] }]),
    );
    expect(longSections[0].items[0].renderBody()).toBe(`term ${long}`);
    expect(renderSavedView(query, longSections)).not.toContain("<table>");
  });

  it("renders AI forms and Linguee special forms as pair tables with form headers", () => {
    const forms = view(
      dictionary(
        [{ kind: "pairs", relation: "form", entries: [{ expression: "past tense", meaning: "ran" }] }],
        query,
        DictionaryType.AI,
      ),
    );
    expect(forms[0].items[0].copyText).toBe("past tense: ran");
    expect(renderSavedView(query, forms)).toContain("<th>Form</th><th>Value</th>");
    expect(renderSavedView(query, forms)).toContain("<td>past tense</td><td>ran</td>");
    const equivalents = view(
      dictionary(
        [
          {
            kind: "equivalents",
            headword: { word: "good" },
            entries: [
              {
                text: "bon",
                partOfSpeech: "adj",
                frequency: "special-forms",
                prominent: true,
                inflectionNote: "bonne",
              },
            ],
          },
        ],
        query,
        DictionaryType.Linguee,
      ),
    );
    const saved = renderSavedView(query, equivalents);
    expect(saved).toContain("<th>Form</th><th>Value</th>");
  });

  it("keeps multiline source and translation paragraphs outside headings and comparison tables", () => {
    const sentence = { ...query, word: "First line\nSecond line", isWord: false };
    const sections = view(translation("One", ["第一段", "", "第二段"], sentence));
    expect(sections[0].items[0]).toMatchObject({ title: "第一段, , 第二段", copyText: "第一段\n\n第二段" });
    const standalone = renderStandaloneRow(sections[0].items[0]);
    expect(standalone).toContain("> First line  \n> Second line");
    expect(standalone).toContain("第一段\n\n第二段");
    expect(standalone).not.toContain("##");
    expect(standalone).not.toContain("<table>");
    expect(renderSelectedRow(sections[0].items[0], sections)).not.toContain("First line");
    const saved = renderSavedView(sentence, sections);
    expect(saved).toContain("First line");
    expect(saved).not.toContain("English →");
  });

  it("compacts adjacent translations without moving them across a dictionary and keeps different profiles", () => {
    const sections = view(
      translation("First", ["证词"]),
      dictionary([{ kind: "translation", text: "证言" }]),
      translation("Second", ["证词"]),
      translation("Third", ["证据"]),
    );
    const saved = renderSavedView(query, sections);
    expect(saved.indexOf("First")).toBeLessThan(saved.indexOf("Youdao Dictionary"));
    expect(saved.indexOf("Youdao Dictionary")).toBeLessThan(saved.indexOf("Second"));
    expect(saved).toContain("Third");
    expect(saved.match(/<table>/g)).toHaveLength(1);
    expect(saved.match(/𝐭𝐞𝐬𝐭𝐢𝐦𝐨𝐧𝐲/g)).toHaveLength(1);
  });

  it("skips empty sections and labels a dictionary's different direction and pronunciation", () => {
    const sections = view(
      dictionary(
        [
          { kind: "definitions", entries: [] },
          { kind: "translation", text: "témoignage", pronunciation: "temwaɲaʒ" },
        ],
        { ...query, toLanguage: "fr" },
      ),
    );
    const saved = renderSavedView({ ...query, phonetic: "source sound" }, sections);
    expect(saved).toContain("Youdao Dictionary · English → French · temwaɲaʒ");
    expect(saved).toContain("**témoignage**");
    expect(saved).not.toContain("Explanation");
  });
});
