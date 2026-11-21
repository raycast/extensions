import { describe, expect, it } from "vitest";

import { DictionaryType, TranslationType } from "@/core/results/kinds";

import { decodeLegacyFavorites } from "./decode";

const info = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };
const item = {
  queryType: DictionaryType.Linguee,
  displayType: "Common",
  queryWordInfo: info,
  key: "entry",
  title: "你好",
  copyText: "你好 hello",
};
const sections = [{ type: "Common", items: [item] }];

function read(displaySections: unknown[]) {
  return decodeLegacyFavorites([{ ...info, createdAt: 1, displaySections }])[0];
}

describe("legacy display decoding", () => {
  it("preserves legacy missing metadata and mixed Linguee frequencies in one section", () => {
    const source = [{ ...sections[0], items: [item, { ...item, displayType: "Less Common" }] }];
    expect(read(JSON.parse(JSON.stringify(source))).services[0]).toMatchObject({
      serviceId: DictionaryType.Linguee,
      content: { sections: [{ rows: [{ frequency: "common" }, { frequency: "less-common" }] }] },
    });
  });

  it("reads legacy query metadata, bodies and icon variants alongside obsolete display fields", () => {
    for (const serviceIcon of [
      { kind: "preset", name: "openai" },
      { kind: "remote", url: "https://example.com/icon.png" },
      { kind: "favicon", website: "https://example.com" },
      { kind: "initials" },
    ]) {
      const source = [
        {
          ...sections[0],
          serviceId: "profile:1",
          sectionTitle: "Details",
          items: [
            {
              ...item,
              serviceId: "profile:1",
              serviceLabel: "Example",
              serviceIcon,
              fromCache: true,
              subtitle: "noun",
              tooltip: "Common",
              detailsMarkdown: "**你好**",
              accessoryItem: { phonetic: "hello", examTypes: ["CET4"], example: "hello there" },
              queryWordInfo: {
                ...info,
                isWord: true,
                phonetic: "hello",
                speechUrl: "https://example.com/audio.mp3",
                examTypes: ["CET4"],
              },
            },
          ],
        },
      ];
      expect(read(JSON.parse(JSON.stringify(source))).services[0]).toMatchObject({
        serviceId: "profile:1",
        serviceLabel: "Example",
        serviceIcon,
        content: {
          query: {
            ...info,
            isWord: true,
            phonetic: "hello",
            speechUrl: "https://example.com/audio.mp3",
            examTypes: ["CET4"],
          },
          sections: [{ rows: [{ subtitle: "noun", bodyMarkdown: "**你好**", phonetic: "hello" }] }],
        },
      });
    }
  });

  it.each([
    { key: 17 },
    { tooltip: [] },
    { accessoryItem: { example: false } },
    { detailsMarkdown: 17 },
    { subtitle: [] },
    { fromCache: "yes" },
    { serviceLabel: false },
    { accessoryItem: { examTypes: [17] } },
    { accessoryItem: { phonetic: {} } },
    { queryWordInfo: { ...info, isWord: "yes" } },
    { queryWordInfo: { ...info, speechUrl: {} } },
    { queryWordInfo: { ...info, examTypes: [false] } },
    { serviceIcon: { kind: "preset", name: "unknown" } },
    { serviceIcon: { kind: "remote", url: 17 } },
    { displayType: "Definition" },
    { queryType: "unknown" },
    { queryType: TranslationType.Bing },
  ])("rejects invalid fields before they reach rendering (%j)", (override) => {
    expect(() => read([{ ...sections[0], items: [{ ...item, ...override }] }])).toThrow();
  });

  it("rejects mismatched section and item discriminants", () => {
    expect(() => read([{ type: "Definition", items: [item] }])).toThrow();
  });
});
