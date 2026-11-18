import { describe, expect, it, vi } from "vitest";

import { DictionaryType, TranslationType } from "@/core/results/kinds";

import type { ComposedContent, ComposedService } from "./compose";
import * as markdown from "./markdown";
import { renderSelectedRow } from "./render";
import type { DictionarySection } from "./types";
import { buildContentView } from "./view";

const query = { word: "word", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
function dictionary(sections: readonly DictionarySection[], type = DictionaryType.Linguee): ComposedService {
  return {
    type,
    serviceId: "dictionary",
    serviceLabel: "Dictionary",
    serviceOrder: 0,
    content: { kind: "dictionary", query, sections },
  };
}
function translation(serviceId: string, paragraphs: readonly string[]): ComposedService {
  return {
    type: TranslationType.OpenAI,
    serviceId,
    serviceLabel: serviceId,
    serviceOrder: 1,
    content: { kind: "translation", query, paragraphs },
  };
}
function compose(...services: ComposedService[]): ComposedContent {
  return { services, isShowDetail: false };
}

describe("content view", () => {
  it("does not build dictionary Markdown or comparisons until that detail is requested", () => {
    const plainText = vi.spyOn(markdown, "plainText");
    const escapeHtml = vi.spyOn(markdown, "escapeHtml");
    const body = vi.fn(() => "complex **body**");
    try {
      const sections = buildContentView(
        compose(
          translation("One", ["first"]),
          translation("Two", ["second"]),
          dictionary(
            [
              {
                kind: "definitions",
                entries: [{ kind: "structured", meanings: ["a*b"], explanation: "<value>", examples: [] }],
              },
              {
                kind: "chinese-entry",
                entries: [
                  {
                    summary: "summary",
                    get markdown() {
                      return body();
                    },
                  },
                ],
              },
            ],
            DictionaryType.AI,
          ),
        ),
        true,
      );
      expect(plainText).not.toHaveBeenCalled();
      expect(escapeHtml).not.toHaveBeenCalled();
      expect(body).not.toHaveBeenCalled();
      expect(renderSelectedRow(sections[1].items[0], sections)).toContain("second");
      expect(escapeHtml).toHaveBeenCalled();
      expect(body).not.toHaveBeenCalled();
      expect(sections[2].items[0].renderBody()).toBe("**a\\*b**\n\n&lt;value&gt;");
      expect(body).not.toHaveBeenCalled();
      expect(sections[3].items[0].renderBody()).toBe("complex **body**");
      expect(body).toHaveBeenCalledOnce();
    } finally {
      plainText.mockRestore();
      escapeHtml.mockRestore();
    }
  });

  it.each([
    { text: "translated", body: "translated n.       例句" },
    { text: "n", body: "n.       例句" },
  ])("supplements only the first row and avoids repeating its subtitle prefix ($text)", ({ text, body }) => {
    const content = dictionary([
      {
        kind: "equivalents",
        headword: { word: "word" },
        entries: [
          { text: "term", prominent: true, frequency: "common", partOfSpeech: "n", firstExampleTranslation: "例句" },
          { text: "second", prominent: true, frequency: "common" },
        ],
      },
      { kind: "examples", entries: [{ sentence: "old example", translation: "旧例句" }] },
    ]);
    const original = structuredClone(content);
    const sections = buildContentView(compose({ ...content, primarySupplement: { translation: text } }), true);
    expect(sections[0].items[0]).toMatchObject({
      title: text,
      copyText: text,
      subtitle: "n.       例句",
    });
    expect(sections[0].items[0].renderBody()).toBe(body);
    expect(sections[0].items[1].title).toBe("second");
    expect(sections[1].items[0].title).toBe("old example");
    expect(sections[0].service).toBe(sections[1].service);
    expect(sections[0].items[1].service).toBe(sections[0].service);
    expect(sections[0].service.query).toBe(content.content.query);
    expect(content).toEqual(original);
  });

  it("uses the supplement as the full body when the first dictionary row has an empty subtitle", () => {
    const source = dictionary([
      { kind: "summary", source: "wikipedia", entries: [{ subject: "term", text: "original body" }] },
    ]);
    const row = buildContentView(compose({ ...source, primarySupplement: { translation: "replacement" } }), true)[0]
      .items[0];
    expect(row).toMatchObject({ title: "replacement", copyText: "replacement", subtitle: "" });
    expect(row.renderBody()).toBe("replacement");
  });

  it("does not carry a supplement over an empty first section", () => {
    const source = dictionary([
      { kind: "equivalents", headword: { word: "word" }, entries: [] },
      { kind: "translation", text: "original" },
    ]);
    const sections = buildContentView(
      compose({ ...source, primarySupplement: { translation: "replacement", phonetic: "[source]" } }),
      true,
    );
    expect(sections[0].items).toEqual([]);
    expect(sections[1].items[0]).toMatchObject({ title: "original", accessory: undefined });
  });

  it.each([
    { phonetic: "new", examTypes: undefined },
    { phonetic: undefined, examTypes: ["CET4"] },
  ])("replaces phonetic and exam metadata together when one companion is missing (%j)", (primarySupplement) => {
    const service: ComposedService = {
      type: DictionaryType.Youdao,
      serviceId: "youdao",
      serviceLabel: "Youdao",
      serviceOrder: 0,
      content: {
        kind: "dictionary",
        query: { ...query, phonetic: "old", examTypes: ["old exam"] },
        sections: [{ kind: "translation", text: "word" }],
      },
      primarySupplement,
    };
    const row = buildContentView(compose(service), true)[0].items[0];
    expect(row.accessory).toStrictEqual(primarySupplement);
    expect(row.service.query).toMatchObject({ phonetic: "old", examTypes: ["old exam"] });
  });

  it.each([DictionaryType.AI, DictionaryType.Youdao, DictionaryType.Linguee, DictionaryType.Eudic])(
    "renders every semantic section for %s without treating its layout as a protocol restriction",
    (type) => {
      const content: DictionarySection[] = [
        { kind: "translation", text: "translation text" },
        {
          kind: "equivalents",
          headword: { word: "word" },
          entries: [{ text: "equivalent text", prominent: true, frequency: "common" }],
        },
        { kind: "definitions", entries: [{ kind: "plain", text: "definition text" }] },
        { kind: "pairs", relation: "related", entries: [{ expression: "pair text", meaning: "meaning" }] },
        { kind: "form-set", forms: [{ label: "past", value: "form text" }] },
        { kind: "examples", entries: [{ sentence: "example text" }] },
        { kind: "summary", source: "encyclopedia", entries: [{ subject: "subject", text: "summary text" }] },
        { kind: "chinese-entry", entries: [{ summary: "chinese text", markdown: "complex chinese body" }] },
      ];
      const sections = buildContentView(compose(dictionary(content, type)), true);
      expect(sections.map((section) => section.kind)).toEqual([
        "translation",
        "equivalents",
        "definitions",
        "pairs",
        "form-set",
        "examples",
        "summary",
        "chinese-entry",
      ]);
      const markers = [
        "translation text",
        "equivalent text",
        "definition text",
        "pair text",
        "form text",
        "example text",
        "summary text",
        "chinese text",
      ];
      sections.forEach((section, index) => expect(section.items[0].copyText).toContain(markers[index]));
      expect(sections[7].items[0].renderBody()).toBe("complex chinese body");
      expect(sections[6].items[0].summarySource).toBe("encyclopedia");
    },
  );

  it.each([false, true])("resets a translation heading only when a dictionary has a section (%s)", (hasSection) => {
    const sections = buildContentView(
      compose(
        translation("One", ["one"]),
        dictionary(hasSection ? [{ kind: "examples", entries: [] }] : []),
        translation("Two", ["two"]),
      ),
      true,
    );
    expect(sections.at(-1)?.title).toBe(hasSection ? "Two   (English --> Chinese-Simplified)" : "Two");
  });

  it("uses emoji-only directions for detailed translations while retaining explicit unknown-language labels", () => {
    expect(buildContentView({ ...compose(translation("One", ["long"])), isShowDetail: true }, false)[0].title).toBe(
      "One   (🇺🇸 --> 🇨🇳)",
    );
    const source: ComposedService = {
      type: TranslationType.Google,
      serviceId: "unknown",
      serviceLabel: "Unknown",
      serviceOrder: 0,
      content: {
        kind: "translation",
        paragraphs: ["text"],
        query: { ...query, fromLanguage: "custom-from", toLanguage: "custom-to" },
      },
    };
    expect(buildContentView(compose(source), false)[0].title).toBe("Unknown   (custom-from🌐 --> custom-to🌐)");
  });
});
