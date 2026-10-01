import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { LingueeDictionaryProvider } from ".";

const fetchRaw = vi.hoisted(() => vi.fn());
vi.mock("@/shared/http", () => ({ timedFetch: { raw: fetchRaw } }));
vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  getPreferenceValues: () => ({}),
}));

const query = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };

beforeEach(() => fetchRaw.mockReset());

describe("Linguee HTML boundary", () => {
  it("preserves request metadata for an empty page", async () => {
    respondWithHTML("<html><div id='dictionary'></div></html>");
    const result = await new LingueeDictionaryProvider().request(query);

    expect(result.content.query).toMatchObject(query);
    expect(result.content.sections).toEqual([]);
  });

  it("uses the request languages when an exact entry has unknown or missing script languages", async () => {
    // Synthetic protocol fixture: one exact entry, with an unknown source and no target language.
    respondWithHTML(`
      <script type="text/javascript">sourceLang:'xx',</script>
      <div class="l_deepl_ad__querytext">goods</div>
      <div id="dictionary"><div class="exact"><div class="lemma">
        <div class="lemma_desc"><span class="tag_lemma"><a class="dictLink">goods</a></span></div>
        <div class="lemma_content"><div class="translation sortablemg featured"><a class="dictLink">货物</a></div></div>
      </div></div></div>
    `);
    const result = await new LingueeDictionaryProvider().request(query);

    expect(result.content.query).toMatchObject({ ...query, word: "goods" });
    expect(result.content.sections[0]).toMatchObject({ kind: "translation", text: "货物" });
  });

  it("builds semantic content from exact entries, examples, related words, and Wikipedia without duplicates", async () => {
    respondWithHTML(readFileSync(`${__dirname}/fixtures/dictionary.html`, "utf8"));
    const result = await new LingueeDictionaryProvider().request(query);

    expect(result).toMatchObject({
      content: {
        kind: "dictionary",
        query: {
          word: "good & nice",
          fromLanguage: "en",
          toLanguage: "fr",
          isWord: true,
          speechUrl: "https://www.linguee.com/mp3/EN_US_good.mp3",
        },
        sections: [
          { kind: "translation", text: "bon & beau", lemma: "good & nice" },
          {
            kind: "equivalents",
            headword: { word: "good", qualifier: "(sth. good)", partOfSpeech: "adj  formal" },
            entries: [
              {
                text: "bon & beau",
                partOfSpeech: "adj",
                prominent: true,
                frequency: "often",
                inflectionNote: "(often used) (bonne f sl)",
                firstExampleTranslation: "un & bon livre",
              },
              { text: "vrai", prominent: true, frequency: "almost-always", inflectionNote: "(almost always used)" },
              { text: "bonne", prominent: true, frequency: "special-forms", inflectionNote: "(bonnes f pl)" },
              { text: "agréable", prominent: true, frequency: "common", inflectionNote: "" },
              { text: "bien", prominent: false, frequency: "less-common", partOfSpeech: "adv" },
            ],
          },
          { kind: "equivalents", headword: { word: "goods", qualifier: "pl.", partOfSpeech: "n" }, entries: [] },
          {
            kind: "examples",
            entries: [{ sentence: "good news", partOfSpeech: "n", translation: "bonne nouvelle;  heureuse nouvelle" }],
          },
          {
            kind: "pairs",
            relation: "related",
            entries: [{ expression: "goodness", partOfSpeech: "n", meaning: "bonté;  vertu" }],
          },
          { kind: "summary", source: "wikipedia", entries: [{ subject: "Good & evil", text: "An ethical concept." }] },
        ],
      },
    });
    expect(result).not.toHaveProperty("result");
  });

  it("keeps the requested word and direction when only an example is returned", async () => {
    respondWithHTML(`
      <script type="text/javascript">sourceLang:'ZH',targetLang:'EN',</script>
      <div class="l_deepl_ad__querytext">other query</div>
      <div id="dictionary"><div class="inexact"><h3>Examples:</h3>
        <div class="lemma"><div class="line"><a class="dictLink">good news</a></div>
          <div class="lemma_content"><a class="dictLink">好消息</a></div>
        </div>
      </div></div>
    `);
    const result = await new LingueeDictionaryProvider().request(query);

    expect(result.content.query).toMatchObject(query);
    expect(result.content.sections).toMatchObject([
      { kind: "examples", entries: [{ sentence: "good news", translation: "好消息" }] },
    ]);
  });

  it("preserves latin1 response decoding and skips unsupported requests", async () => {
    const html = `<div id="dictionary"><div class="wikipedia"><div class="abstract"><h2>Café</h2><p>A café.</p></div></div></div>`;
    fetchRaw.mockResolvedValue({
      headers: new Headers({ "content-type": "text/html; charset=iso-8859-15" }),
      _data: Uint8Array.from(Buffer.from(html, "latin1")).buffer,
    });
    const provider = new LingueeDictionaryProvider();
    const result = await provider.request(query);
    expect(result.content.sections).toMatchObject([
      { kind: "summary", source: "wikipedia", entries: [{ subject: "Café", text: "A café." }] },
    ]);

    const skipped = await provider.request({ ...query, isWord: false });
    expect(skipped.content.query.isWord).toBe(false);
    expect(skipped.content.sections).toEqual([]);
    expect(fetchRaw).toHaveBeenCalledTimes(1);
  });
});

function respondWithHTML(html: string, contentType = "text/html; charset=utf-8") {
  fetchRaw.mockResolvedValue({
    headers: new Headers({ "content-type": contentType }),
    _data: new TextEncoder().encode(html).buffer,
  });
}
