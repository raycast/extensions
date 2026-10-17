import { describe, expect, it } from "vitest";

import { decodeFavoriteSnapshot, decodeLegacyFavorites } from "./decode";

const query = {
  word: "hello",
  fromLanguage: "en",
  toLanguage: "zh-CHS",
  isWord: true,
  phonetic: "həˈləʊ",
  examTypes: ["CET4"],
  speechUrl: "https://audio.test/hello",
};
const service = {
  type: "Bing Translate",
  serviceId: "bing",
  serviceLabel: "Saved Bing",
  serviceOrder: 0,
  serviceIcon: { kind: "remote", url: "https://icons.test/bing" },
  content: { kind: "translation", query, paragraphs: ["", "你好\n您好"] },
  primarySupplement: { translation: "", phonetic: "", examTypes: [] },
};
const favorite = { query, services: [service], createdAt: 1 };
const legacyRow = {
  kind: "equivalent",
  title: "hello",
  subtitle: "greeting",
  copyText: "hello greeting",
  bodyMarkdown: "body",
  phonetic: "",
  query: { ...query, toLanguage: "fr" },
  frequency: "special-forms",
  prominent: true,
};
const legacyService = {
  ...service,
  type: "Linguee Dictionary",
  content: {
    kind: "legacy",
    role: "dictionary",
    query,
    sections: [{ kind: "equivalents", title: "Forms", rows: [legacyRow] }],
  },
};

describe("favorite snapshot decoding", () => {
  it("round-trips fresh and migrated content, query metadata, supplements and legacy previews", () => {
    const input = { ...favorite, services: [service, legacyService], legacyPreview: ["old preview"] };
    const result = decodeFavoriteSnapshot(JSON.parse(JSON.stringify(input)));
    expect(result).toEqual(input);
    expect(JSON.parse(JSON.stringify(result))).toEqual(input);
  });

  it("constructs a clean snapshot without unknown runtime or old display fields", () => {
    const result = decodeFavoriteSnapshot({
      ...favorite,
      obsolete: "root",
      query: { ...query, obsolete: "query" },
      services: [
        {
          ...service,
          fromCache: true,
          rawPayload: { entireResponse: true },
          content: { ...service.content, translations: ["old"] },
        },
        {
          ...legacyService,
          content: {
            ...legacyService.content,
            sections: [
              {
                ...legacyService.content.sections[0],
                rows: [{ ...legacyRow, key: "old-key", showMoreDetailsMarkdown: "old-page" }],
              },
            ],
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/obsolete|fromCache|rawPayload|translations|old-key|old-page/);
  });

  it.each([
    { ...favorite, query: { ...query, phonetic: 42 } },
    { ...favorite, createdAt: Infinity },
    { ...favorite, legacyPreview: [42] },
    { ...favorite, services: [{ ...service, type: "AI Dictionary" }] },
    { ...favorite, services: [{ ...service, serviceIcon: { kind: "preset", name: "unknown" } }] },
    { ...favorite, services: [{ ...service, primarySupplement: { examTypes: [false] } }] },
    { ...favorite, services: [{ ...service, content: { ...service.content, paragraphs: [1] } }] },
    { ...favorite, services: [{ ...legacyService, content: { ...legacyService.content, role: "other" } }] },
    {
      ...favorite,
      services: [
        {
          ...legacyService,
          content: {
            ...legacyService.content,
            sections: [{ kind: "definitions", rows: [{ ...legacyRow, query: { ...query, speechUrl: [] } }] }],
          },
        },
      ],
    },
    {
      ...favorite,
      services: [
        {
          ...legacyService,
          content: {
            ...legacyService.content,
            sections: [{ kind: "equivalents", rows: [{ ...legacyRow, bodyMarkdown: false }] }],
          },
        },
      ],
    },
  ])("rejects malformed persisted consumers rather than returning a partially valid snapshot: %j", (value) => {
    expect(() => decodeFavoriteSnapshot(value)).toThrow("Invalid saved result field");
  });

  it("rejects an entire old collection when an entry or optional field is malformed", () => {
    const good = { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS", createdAt: 1, displaySections: [] };
    expect(decodeLegacyFavorites([good])).toMatchObject([{ query: { word: "hello" }, services: [], createdAt: 1 }]);
    expect(() => decodeLegacyFavorites([good, { ...good, translations: [1] }])).toThrow();
    expect(() =>
      decodeLegacyFavorites([good, { ...good, displaySections: [{ type: "Translation", items: [null] }] }]),
    ).toThrow();
    expect(() => decodeLegacyFavorites({ favorites: [good] })).toThrow();
  });
});
