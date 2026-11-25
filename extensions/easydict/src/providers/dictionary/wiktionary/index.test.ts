import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildContentView } from "@/core/content/view";
import { CancelledError } from "@/shared/errors";

import { WiktionaryDictionaryProvider } from ".";
import { parseWiktionaryPronunciation } from "./parse";

const fetchRaw = vi.hoisted(() => vi.fn());
vi.mock("@/shared/http", () => ({ timedFetch: { raw: fetchRaw } }));
vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  getPreferenceValues: () => ({}),
}));

const fixture = (name: string) => readFileSync(`${__dirname}/fixtures/${name}`, "utf8");

const homeDefinitions = {
  en: [{ language: "English", partOfSpeech: "Noun", definitions: [{ definition: "A place to live." }] }],
};
const homeHeadword = "{{en-noun\n|{{l|en|homes}}\n}}";
const homeWikitext = `==English==
===Noun===
[[File:Home.jpg|thumb|A home]]
${homeHeadword}
# A place to live.
====Translations====
{{trans-top|dwelling}}
* Danish: {{t|da|hjem}}
{{trans-bottom}}`;

const pages: Record<string, () => unknown> = {
  "rest_v1/page/definition/home": () => homeDefinitions,
  "title=home&action=raw": () => homeWikitext,
  "action=parse&title=home&prop=text&contentmodel=wikitext&": () => ({ parse: { text: "" } }),
  "rest_v1/page/definition/hus": () => JSON.parse(fixture("definition-hus.json")),
  "rest_v1/page/definition/house": () => JSON.parse(fixture("definition-house.json")),
  "title=hus&action=raw": () => fixture("hus.wikitext"),
  "title=house&action=raw": () => fixture("house.wikitext"),
  "title=house/translations&action=raw": () => fixture("house-translations.wikitext"),
  "action=parse&title=hus&prop=text&contentmodel=wikitext&": () => JSON.parse(fixture("parse-hus.json")),
  "action=parse&title=house&prop=text&contentmodel=wikitext&": () => JSON.parse(fixture("parse-house.json")),
};

const properNounPages = {
  "rest_v1/page/definition/House": () => ({
    en: [
      {
        language: "English",
        partOfSpeech: "Proper noun",
        definitions: [{ definition: "A particular chamber of political representation" }],
      },
    ],
  }),
  "title=House&action=raw": () => "==English==\n===Proper noun===\n",
};
let activePages: typeof pages;

beforeEach(() => {
  activePages = { ...pages };
  fetchRaw.mockReset();
  fetchRaw.mockImplementation(async (url: string) => {
    const page = Object.entries(activePages).find(([path]) => url.endsWith(path) || url.includes(`${path}format`))?.[1];
    return page ? { status: 200, ok: true, _data: page() } : { status: 404, ok: false, _data: undefined };
  });
});

describe("Wiktionary dictionary", () => {
  it("posts a complete multiline headword template, including nested template arguments", async () => {
    await new WiktionaryDictionaryProvider().request({ word: "home", fromLanguage: "en", toLanguage: "da" });

    const formsCall = fetchRaw.mock.calls.find(([url]) => String(url).includes("action=parse"));
    expect(formsCall?.[1]).toMatchObject({ method: "POST", body: expect.any(URLSearchParams) });
    expect((formsCall?.[1].body as URLSearchParams).get("text")).toBe(`===Noun===\n${homeHeadword}`);
  });

  it("uses English speech for definitions alongside a Danish translation", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "home",
      fromLanguage: "en",
      toLanguage: "da",
    });
    const rows = buildContentView(
      {
        services: [{ ...result, serviceId: "wiktionary", serviceLabel: "Wiktionary", serviceOrder: 0 }],
        isShowDetail: false,
      },
      true,
    ).flatMap((section) => section.items);

    expect(rows.find(({ kind }) => kind === "definition")).toMatchObject({
      title: expect.stringContaining("A place to live."),
      textLanguage: "en",
      service: { query: { toLanguage: "da" } },
    });
    expect(rows[0]).toMatchObject({ kind: "translation", title: "hjem" });
    expect(rows[0].textLanguage).toBeUndefined();
  });

  it("shows English glosses, pronunciation, and word forms for a Danish word", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "hus",
      fromLanguage: "da",
      toLanguage: "en",
    });
    const sections = result.content.sections;

    expect(result.content.query).toMatchObject({ word: "hus", isWord: true, phonetic: "[ˈhuˀs]" });
    expect(sections[0]).toEqual({
      kind: "translation",
      text: "house; building; block of flats, cottage",
      lemma: "hus",
    });
    expect(sections[1]).toEqual({
      kind: "form-set",
      forms: [
        { label: "noun", value: "hus" },
        { label: "gender", value: "neuter" },
        { label: "singular definite", value: "huset" },
        { label: "plural indefinite", value: "huse" },
      ],
    });
    expect(sections[2]).toMatchObject({
      kind: "equivalents",
      headword: { word: "hus", partOfSpeech: "noun" },
      entries: [
        { text: "house", partOfSpeech: "n", prominent: true },
        { text: "building", partOfSpeech: "n", prominent: true },
        { text: "block of flats, cottage", partOfSpeech: "n", prominent: true },
        { text: "shell", partOfSpeech: "n", prominent: true },
      ],
    });
    // "imperative of huse" is a grammatical form, folded into a collapsed row.
    expect(sections).toContainEqual({
      kind: "equivalents",
      headword: { word: "hus", partOfSpeech: "verb" },
      entries: [{ text: "imperative of huse", partOfSpeech: "v", prominent: false, frequency: "special-forms" }],
    });
    // Only the Danish headword templates are rendered, not the whole section.
    const formsCall = fetchRaw.mock.calls.find(([url]) => String(url).includes("action=parse"));
    expect((formsCall?.[1].body as URLSearchParams).get("text")).toBe(
      "===Noun===\n{{da-noun|et|e}}\n===Verb===\n{{head|da|verb form}}",
    );
  });

  it("shows Danish translations, forms, and examples for an English word", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "house",
      fromLanguage: "en",
      toLanguage: "da",
    });
    const sections = result.content.sections;

    expect(result.content.query.phonetic).toBe("/haʊ̯s/");
    expect(sections[0]).toMatchObject({ kind: "translation", text: "hus" });
    expect(fetchRaw).not.toHaveBeenCalledWith(
      expect.stringMatching(/title=(?:house_music|bingo)&action=raw/),
      expect.anything(),
    );
    const formsCall = fetchRaw.mock.calls.find(([url]) => String(url).includes("action=parse"));
    expect((formsCall?.[1].body as URLSearchParams).get("text")?.split("\n")).toEqual([
      "====Noun====",
      "{{en-noun|~|s|housen<l:dialectal>|hice<l:chiefly,humorous>}}",
      "====Verb====",
      "{{en-verb}}",
      "====Noun====",
      "{{en-noun|-}}",
    ]);
    expect(sections[1]).toMatchObject({
      kind: "form-set",
      forms: [
        { label: "noun", value: "house" },
        { label: "plural", value: "houses" },
      ],
    });
    expect(sections).toContainEqual({
      kind: "equivalents",
      headword: { word: "house", qualifier: "(human abode)", partOfSpeech: "noun" },
      entries: [{ text: "hus", partOfSpeech: "n", prominent: true, frequency: "common" }],
    });
    expect(sections).toContainEqual(
      expect.objectContaining({
        headword: expect.objectContaining({
          qualifier: "(keep within a structure or container)",
          partOfSpeech: "verb",
        }),
        entries: [expect.objectContaining({ text: "indhuse", partOfSpeech: "v" })],
      }),
    );
    expect(sections.map((section) => section.kind)).not.toContain("examples");
    expect(sections.at(-1)).toMatchObject({
      kind: "definitions",
      entries: expect.arrayContaining([
        {
          kind: "structured",
          meanings: ["A structure built or serving as an abode of human beings."],
          partOfSpeech: "n",
          examples: [{ sentence: "This is my house and my family's ancestral home." }],
        },
      ]),
    });
  });

  it("shows Bokmål and Nynorsk entries for a Norwegian word", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "hus",
      fromLanguage: "no",
      toLanguage: "en",
    });

    expect(result.content.query.phonetic).toBe("/hʉːs/");
    expect(result.content.sourceUrl).toBe("https://en.wiktionary.org/wiki/hus#Norwegian_Bokm%C3%A5l");
    // Bokmål and Nynorsk share the meaning "a house"; it is shown once.
    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "a house" });
    const glosses = result.content.sections.flatMap((section) =>
      section.kind === "equivalents" ? section.entries.map((entry) => entry.text) : [],
    );
    expect(glosses.filter((gloss) => gloss === "a house")).toHaveLength(1);
    expect(glosses).toContainEqual(expect.stringContaining("a small container"));
    expect(result.content.sections).toContainEqual(
      expect.objectContaining({
        kind: "equivalents",
        headword: { word: "hus", partOfSpeech: "noun" },
        entries: expect.arrayContaining([expect.objectContaining({ text: "a house" })]),
      }),
    );
    const formsCall = fetchRaw.mock.calls.find(([url]) => String(url).includes("action=parse"));
    const fragment = (formsCall?.[1].body as URLSearchParams).get("text");
    expect(fragment).toContain("{{nb-noun-n1}}");
    expect(fragment).toContain("{{nn-noun-n1}}");
  });

  it("puts each meaning's first example inline, strips embedded styles, and keeps long glosses out of the first row", async () => {
    activePages["rest_v1/page/definition/tilf%C3%A6ldighed"] = () => ({
      en: [
        {
          partOfSpeech: "Noun",
          language: "Danish",
          definitions: [
            {
              definition:
                'The quality of being contingent. <style data-mw-deduplicate="TemplateStyles:r1">.mw-parser-output .defdate{font-size:smaller}</style>',
              parsedExamples: [{ example: "Det <b>tilfældige</b>.", translation: "The contingency of events." }],
            },
            { definition: "An amount of money paid to the other party (usually the supplier) on breach of contract." },
          ],
        },
      ],
    });
    const result = await new WiktionaryDictionaryProvider().request({
      word: "tilfældighed",
      fromLanguage: "da",
      toLanguage: "en",
    });

    expect(result.content.sections[0]).toEqual({
      kind: "translation",
      text: "The quality of being contingent.",
      lemma: "tilfældighed",
    });
    expect(result.content.sections[1]).toMatchObject({
      kind: "equivalents",
      entries: [
        {
          text: "The quality of being contingent.",
          firstExampleTranslation: "Det tilfældige.",
          examples: [{ sentence: "Det tilfældige.", translation: "The contingency of events." }],
        },
        { text: "An amount of money paid to the other party (usually the supplier) on breach of contract." },
      ],
    });
  });

  it("returns a Chinese entry when the definitions API has one", async () => {
    activePages["rest_v1/page/definition/%E4%BD%A0%E5%A5%BD"] = () => ({
      zh: [{ language: "Chinese", partOfSpeech: "Interjection", definitions: [{ definition: "hello; hi" }] }],
    });

    const result = await new WiktionaryDictionaryProvider().request({
      word: "你好",
      fromLanguage: "zh-CHS",
      toLanguage: "en",
    });

    expect(result.content.sourceUrl).toBe("https://en.wiktionary.org/wiki/%E4%BD%A0%E5%A5%BD#Chinese");
    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "hello; hi" });
  });

  it("looks up the definition behind a simplified Chinese variant and keeps the queried spelling", async () => {
    activePages[`title=${encodeURIComponent("颜色")}&action=raw`] = () => "==Chinese==\n{{zh-see|顏色}}";
    activePages[`rest_v1/page/definition/${encodeURIComponent("顏色")}`] = () => ({
      zh: [
        { language: "Chinese", partOfSpeech: "Noun", definitions: [{ definition: '<a href="/wiki/color">color</a>' }] },
      ],
    });

    const { content } = await new WiktionaryDictionaryProvider().request({
      word: "颜色",
      fromLanguage: "zh-CHS",
      toLanguage: "en",
    });

    expect(content.query.word).toBe("颜色");
    expect(content.sections[0]).toMatchObject({ kind: "translation", text: "color", lemma: "颜色" });
  });

  it.each(["{{zh-see|乾}}\n{{zh-see|幹}}", "{{zh-see|乾|3=dry}}"])(
    "does not borrow definitions from a Chinese reference with ambiguous or limited senses (%s)",
    async (references) => {
      activePages[`title=${encodeURIComponent("干")}&action=raw`] = () => `==Chinese==\n${references}`;
      activePages[`rest_v1/page/definition/${encodeURIComponent("乾")}`] = () => ({
        zh: [{ language: "Chinese", partOfSpeech: "Adjective", definitions: [{ definition: "dry" }] }],
      });

      const { content } = await new WiktionaryDictionaryProvider().request({
        word: "干",
        fromLanguage: "zh-CHS",
        toLanguage: "en",
      });

      expect(content.sections).toEqual([]);
    },
  );

  it("uses the Commons MP3 transcode of the first recording for the source language", () => {
    const wikitext =
      "==English==\n{{audio|en|en-us-cat.ogg}}\n==Danish==\n* {{IPA|da|[kʰæd]}}\n* {{audio|da|Da-kat.ogg}}\n";

    expect(parseWiktionaryPronunciation(wikitext, ["Danish"], ["da"])).toEqual({
      ipa: "[kʰæd]",
      audioUrl: "https://upload.wikimedia.org/wikipedia/commons/transcoded/3/35/Da-kat.ogg/Da-kat.ogg.mp3",
    });
  });

  it("uses the original file of an MP3 recording, which Commons does not transcode", () => {
    const wikitext = "==Hausa==\n* {{audio|ha|Karai-Karai pronunciation.mp3}}\n";

    expect(parseWiktionaryPronunciation(wikitext, ["Hausa"], ["ha"]).audioUrl).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/7/73/Karai-Karai_pronunciation.mp3",
    );
  });

  it("retries a capitalized word in lowercase", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "Hus",
      fromLanguage: "da",
      toLanguage: "en",
    });

    expect(result.content.query.word).toBe("hus");
    expect(result.content.sections.length).toBeGreaterThan(0);
  });

  it("uses Nynorsk definitions and headword templates when there are no Bokmål definitions", async () => {
    const payload: { other: { language: string }[] } = JSON.parse(fixture("definition-hus.json"));
    activePages["rest_v1/page/definition/hus"] = () => ({
      other: payload.other.filter(({ language }) => language === "Norwegian Nynorsk"),
    });

    const result = await new WiktionaryDictionaryProvider().request({
      word: "hus",
      fromLanguage: "no",
      toLanguage: "en",
    });

    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "a house" });
    expect(result.content.query.phonetic).toBe("/hʉːs/");
    expect(result.content).toHaveProperty("sourceUrl", "https://en.wiktionary.org/wiki/hus#Norwegian_Nynorsk");
    const formsCall = fetchRaw.mock.calls.find(([url]) => String(url).includes("action=parse"));
    expect((formsCall?.[1].body as URLSearchParams).get("text")).toBe("===Noun===\n{{nn-noun-n1}}");
  });

  it("includes the main Bokmål sense when translating an English word into Norwegian", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "house",
      fromLanguage: "en",
      toLanguage: "no",
    });

    expect(result.content.sections).toContainEqual(
      expect.objectContaining({
        headword: expect.objectContaining({ qualifier: "(human abode)" }),
        entries: [expect.objectContaining({ text: "hus" })],
      }),
    );
  });

  it("includes a Nynorsk translation in a sense with no other Norwegian variant", async () => {
    activePages["title=house&action=raw"] = () =>
      "==English==\n===Noun===\n{{trans-top|dwelling}}\n* Norwegian:\n*: Nynorsk: {{tt+|nn|hus|n}}\n{{trans-bottom}}\n";

    const result = await new WiktionaryDictionaryProvider().request({
      word: "house",
      fromLanguage: "en",
      toLanguage: "no",
    });

    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "hus" });
  });

  it.each(["hr", "sr-Latn"])("keeps only Latin-script Serbo-Croatian translations for %s", async (toLanguage) => {
    const result = await new WiktionaryDictionaryProvider().request({ word: "house", fromLanguage: "en", toLanguage });

    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "kȕća" });
    expect(result.content.sections).toContainEqual(
      expect.objectContaining({
        headword: expect.objectContaining({ qualifier: "(human abode)" }),
        entries: [expect.objectContaining({ text: "kȕća" })],
      }),
    );
  });

  it("shows an Iranian Persian translation for an English lookup targeting Persian", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "house",
      fromLanguage: "en",
      toLanguage: "fa",
    });

    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: expect.stringContaining("خانِه") });
  });

  it("uses the referenced Danish verb translations while keeping the original spelling", async () => {
    activePages["title=colour&action=raw"] = () => "==English==\n===Verb===\n====Translations====\n{{trans-see|color}}";
    activePages["title=color&action=raw"] = () => `==English==
===Noun===
====Translations====
{{trans-top|hue}}
* Danish: {{t|da|kulør}}
{{trans-bottom}}
===Verb===
{{trans-top|give color to}}
* Danish: {{t|da|farve}}
{{trans-bottom}}`;

    const { content } = await new WiktionaryDictionaryProvider().request({
      word: "colour",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(content.sourceUrl).toBe("https://en.wiktionary.org/wiki/colour#English");
    expect(content.sections[0]).toMatchObject({ kind: "translation", text: "farve", lemma: "colour" });
  });

  it("uses sense IDs and keeps reference order while sharing a lookup of the same subpage", async () => {
    activePages["title=home&action=raw"] = () => `==English==
===Noun===
{{trans-see|dwelling|house|id=home|id1=abode}}
{{trans-see|cottage}}
{{trans-see|residence|house|id=residence}}`;
    activePages["title=house&action=raw"] = () => "==English==\n===Noun===\n{{see translation subpage|Noun}}";
    activePages["title=cottage&action=raw"] = () =>
      "==English==\n===Noun===\n{{trans-top|cottage}}\n* Danish: {{t|da|hytte}}\n{{trans-bottom}}";
    activePages["title=house/translations&action=raw"] = () => `==English==
===Noun===
{{trans-top|institution|id=institution}}
* Danish: {{t|da|institution}}
{{trans-bottom}}
{{trans-top|human abode|id=abode}}
* Danish: {{t|da|hus}}
{{trans-bottom}}
{{trans-top|residence|id=residence}}
* Danish: {{t|da|bolig}}
{{trans-bottom}}`;

    const { content } = await new WiktionaryDictionaryProvider().request({
      word: "home",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(content.sections[0]).toMatchObject({ kind: "translation", text: "hus" });
    const equivalents = content.sections.flatMap((section) =>
      section.kind === "equivalents" ? section.entries.map(({ text }) => text) : [],
    );
    expect(equivalents).toEqual(["hus", "hytte", "bolig"]);
    expect(fetchRaw.mock.calls.filter(([url]) => String(url).endsWith("title=house&action=raw"))).toHaveLength(1);
    expect(
      fetchRaw.mock.calls.filter(([url]) => String(url).endsWith("title=house/translations&action=raw")),
    ).toHaveLength(1);
  });

  it("loads only the referenced section of another entry's translation subpage", async () => {
    activePages["title=a&action=raw"] = () =>
      "==English==\n===Article===\n====Translations====\n{{see translation subpage|1=Article|2=an}}";
    activePages["title=an/translations&action=raw"] = () => `==English==
===Noun===
====Translations====
{{trans-top|a year}}
* French: {{t|fr|année}}
{{trans-bottom}}
===Article===
====Translations====
{{trans-top|indefinite article}}
* French: {{t+|fr|un|m}}, {{t+|fr|une|f}}
{{trans-bottom}}`;

    const { content } = await new WiktionaryDictionaryProvider().request({
      word: "a",
      fromLanguage: "en",
      toLanguage: "fr",
    });

    expect(content.sections[0]).toMatchObject({ kind: "translation", text: "un, une" });
    expect(content.sections.filter(({ kind }) => kind === "equivalents")).toHaveLength(1);
  });

  it.each([
    ["house", { kind: "definitions" }],
    ["house/translations", { kind: "translation", text: "indhuse" }],
  ])(
    "returns available content without caching when the reference request for %s times out",
    async (title, section) => {
      vi.useFakeTimers();
      try {
        const fetch = fetchRaw.getMockImplementation();
        const endpoint = `title=${title}&action=raw`;
        fetchRaw.mockImplementation((url: string, options: { signal?: AbortSignal }) => {
          if (!url.endsWith(endpoint)) return fetch?.(url);
          return new Promise((resolve) => {
            const timer = setTimeout(() => resolve({ status: 503, ok: false }), 4000);
            options.signal?.addEventListener(
              "abort",
              () => {
                clearTimeout(timer);
                resolve({ status: 503, ok: false });
              },
              { once: true },
            );
          });
        });
        activePages["title=home&action=raw"] = () =>
          "==English==\n===Verb===\n====Translations====\n{{trans-see|house}}";

        const pending = new WiktionaryDictionaryProvider().request({
          word: "home",
          fromLanguage: "en",
          toLanguage: "da",
        });
        await vi.advanceTimersByTimeAsync(2500);
        const referenceCall = fetchRaw.mock.calls.find(([url]) => String(url).endsWith(endpoint));
        expect(referenceCall?.[1].signal?.aborted).toBe(true);
        const result = await pending;
        expect(result.cacheable).toBe(false);
        expect(result.content.sections[0]).toMatchObject(section);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it("keeps English definitions when a referenced entry only points to another entry", async () => {
    activePages["title=home&action=raw"] = () => "==English==\n===Noun===\n{{trans-see|house}}";
    activePages["title=house&action=raw"] = () => "==English==\n===Noun===\n{{trans-see|dwelling}}";
    activePages["title=dwelling&action=raw"] = () =>
      "==English==\n===Noun===\n{{trans-top|home}}\n* Danish: {{t|da|bolig}}\n{{trans-bottom}}";

    const { content } = await new WiktionaryDictionaryProvider().request({
      word: "home",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(content.sections[0]).toMatchObject({
      kind: "definitions",
      entries: [expect.objectContaining({ meanings: ["A place to live."] })],
    });
  });

  it("cancels the lookup while fetching a referenced translation", async () => {
    const controller = new AbortController();
    const fetch = fetchRaw.getMockImplementation();
    fetchRaw.mockImplementation(async (url: string) => {
      if (url.endsWith("title=house&action=raw")) {
        controller.abort();
        throw controller.signal.reason;
      }
      return fetch?.(url);
    });
    activePages["title=home&action=raw"] = () => "==English==\n===Noun===\n====Translations====\n{{trans-see|house}}";

    await expect(
      new WiktionaryDictionaryProvider().request(
        { word: "home", fromLanguage: "en", toLanguage: "da" },
        { signal: controller.signal },
      ),
    ).rejects.toBeInstanceOf(CancelledError);
  });

  it("uses the Chinese spelling from the translation table with only one request to render word forms", async () => {
    activePages["title=color&action=raw"] = () => `==English==
===Noun===
{{en-noun}}
# A hue.
====Translations====
{{trans-top|hue}}
* Mandarin: {{t|cmn|顏色}}
{{trans-bottom}}`;
    activePages["action=parse&title=color&prop=text&contentmodel=wikitext&"] = () => ({ parse: { text: "" } });

    const { content } = await new WiktionaryDictionaryProvider().request({
      word: "color",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    expect(content.sections[0]).toMatchObject({ kind: "translation", text: "顏色" });
    expect(fetchRaw.mock.calls.filter(([url]) => String(url).includes("action=parse"))).toHaveLength(1);
  });

  it("keeps English definitions without presenting them as missing Danish translations", async () => {
    activePages["title=house&action=raw"] = () => "==English==\n===Noun===\n";
    const result = await new WiktionaryDictionaryProvider().request({
      word: "house",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(result.content.sections[0]).toMatchObject({
      kind: "definitions",
      entries: expect.arrayContaining([
        {
          kind: "structured",
          meanings: ["A structure built or serving as an abode of human beings."],
          partOfSpeech: "n",
          explanation: "English definition",
          examples: [{ sentence: "This is my house and my family's ancestral home." }],
        },
      ]),
    });
    expect(result.content.sections.some(({ kind }) => kind === "translation" || kind === "equivalents")).toBe(false);
  });

  it("labels Danish glosses as English definitions when the target language is Chinese", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "hus",
      fromLanguage: "da",
      toLanguage: "zh-CHS",
    });

    expect(result.content.query.phonetic).toBe("[ˈhuˀs]");
    expect(result.content.sections[0]).toMatchObject({
      kind: "definitions",
      entries: expect.arrayContaining([
        { kind: "structured", meanings: ["house"], partOfSpeech: "n", explanation: "English definition", examples: [] },
      ]),
    });
    expect(result.content.sections).toContainEqual(expect.objectContaining({ kind: "form-set" }));
    expect(result.content.sections.some(({ kind }) => kind === "translation" || kind === "equivalents")).toBe(false);
  });

  it("tries lowercase translations when the original spelling has no English entry", async () => {
    activePages["title=House&action=raw"] = () => "==French==\n===Noun===\n";
    const result = await new WiktionaryDictionaryProvider().request({
      word: "House",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(result.content.query.word).toBe("house");
    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "hus" });
  });

  it("keeps the original proper noun when it already has a target-language translation", async () => {
    Object.assign(activePages, properNounPages);
    activePages["title=House&action=raw"] = () =>
      "==English==\n===Proper noun===\n====Translations====\n{{trans-top|chamber}}\n* Danish: {{t|da|Folketinget}}\n{{trans-bottom}}\n";
    const result = await new WiktionaryDictionaryProvider().request({
      word: "House",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(result.content.query.word).toBe("House");
    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "Folketinget" });
    expect(fetchRaw.mock.calls.some(([url]) => url.includes("definition/house"))).toBe(false);
  });

  it("keeps the original proper noun definition even when lowercase has a target-language translation", async () => {
    Object.assign(activePages, properNounPages);
    const result = await new WiktionaryDictionaryProvider().request({
      word: "House",
      fromLanguage: "en",
      toLanguage: "da",
    });

    expect(fetchRaw.mock.calls.some(([url]) => url.includes("definition/house"))).toBe(false);
    expect(result.content.query.word).toBe("House");
    expect(result.content.sections[0]).toMatchObject({
      kind: "definitions",
      entries: [
        {
          kind: "structured",
          meanings: ["A particular chamber of political representation"],
          partOfSpeech: "prop n",
          explanation: "English definition",
          examples: [],
        },
      ],
    });
  });

  it("returns the original spelling's definition without depending on the lowercase endpoint", async () => {
    Object.assign(activePages, properNounPages);
    const fetchPage = fetchRaw.getMockImplementation();
    fetchRaw.mockImplementation((url: string) =>
      url.endsWith("/definition/house") ? { status: 503, ok: false, _data: undefined } : fetchPage?.(url),
    );

    await expect(
      new WiktionaryDictionaryProvider().request({ word: "House", fromLanguage: "en", toLanguage: "da" }),
    ).resolves.toMatchObject({ content: { query: { word: "House" }, sections: [{ kind: "definitions" }] } });
  });

  it("returns no sections for a missing page instead of failing", async () => {
    const result = await new WiktionaryDictionaryProvider().request({
      word: "qwzxv",
      fromLanguage: "da",
      toLanguage: "en",
    });

    expect(result.content.sections).toEqual([]);
  });

  it("reports a rate-limited definition request as a provider error", async () => {
    fetchRaw.mockResolvedValue({ status: 429, ok: false, _data: undefined });

    await expect(
      new WiktionaryDictionaryProvider().request({ word: "hus", fromLanguage: "da", toLanguage: "en" }),
    ).rejects.toThrow("429");
  });

  it.each(["house", "accommodate"])(
    "keeps the available translation for %s when its translation subpage fails",
    async (word) => {
      activePages["title=accommodate&action=raw"] = () =>
        "==English==\n===Verb===\n====Translations====\n{{trans-see|house}}";
      const fetchPage = fetchRaw.getMockImplementation();
      fetchRaw.mockImplementation((url: string) =>
        url.endsWith("title=house/translations&action=raw") ? { status: 503, ok: false } : fetchPage?.(url),
      );

      const result = await new WiktionaryDictionaryProvider().request({ word, fromLanguage: "en", toLanguage: "da" });

      expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "indhuse" });
      expect(result.cacheable).toBe(false);
    },
  );

  it("reports a provider error when the word form request fails", async () => {
    const fetchPage = fetchRaw.getMockImplementation();
    fetchRaw.mockImplementation((url: string) =>
      url.includes("action=parse") ? { status: 503, ok: false } : fetchPage?.(url),
    );
    await expect(
      new WiktionaryDictionaryProvider().request({ word: "house", fromLanguage: "en", toLanguage: "da" }),
    ).rejects.toThrow("503");
  });

  it("reports a network timeout while the caller's cancellation signal is still active", async () => {
    const caller = new AbortController();
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    try {
      fetchRaw.mockImplementationOnce((_url: string, { signal }: { signal: AbortSignal }) => {
        deadline.abort(new DOMException("network deadline", "TimeoutError"));
        signal.throwIfAborted();
        return { status: 503, ok: false };
      });

      await expect(
        new WiktionaryDictionaryProvider().request(
          { word: "hus", fromLanguage: "da", toLanguage: "en" },
          { signal: caller.signal },
        ),
      ).rejects.toThrow("network deadline");
      expect(caller.signal.aborted).toBe(false);
    } finally {
      timeout.mockRestore();
    }
  });

  it("passes cancellation to requests and reports a cancelled lookup", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchRaw.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(
      new WiktionaryDictionaryProvider().request(
        { word: "House", fromLanguage: "en", toLanguage: "da" },
        { signal: controller.signal },
      ),
    ).rejects.toBeInstanceOf(CancelledError);
    expect(fetchRaw).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.objectContaining({ aborted: true }) }),
    );
    expect(fetchRaw.mock.calls.some(([url]) => url.includes("definition/house"))).toBe(false);
  });
});
