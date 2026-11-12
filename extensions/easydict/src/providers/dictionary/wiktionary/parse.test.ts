import { describe, expect, it, vi } from "vitest";

import {
  getWiktionaryHeadwordWikitext,
  parseWiktionaryDefinitions,
  parseWiktionaryForms,
  parseWiktionaryTranslationPage,
} from "./parse";

vi.mock("@raycast/api", () => ({ environment: { isDevelopment: false } }));

it("skips commented-out headwords and illustrations without scanning into definitions", () => {
  const wikitext = `==English==
===Noun===
<!--
{{en-noun|wrong}}
-->
[[Image:House.jpg|thumb|A house]]
{{en-noun}}
===Verb===
# A definition without a headword
{{en-verb}}
`;

  expect(getWiktionaryHeadwordWikitext(wikitext, ["English"])).toBe("===Noun===\n{{en-noun}}");
});

describe("Wiktionary definition text", () => {
  it("removes styles, scripts, and comments while decoding named and numeric HTML entities", () => {
    const payload = {
      en: [
        {
          language: "English",
          partOfSpeech: "Noun",
          definitions: [
            {
              definition:
                "<style>.hidden{display:none}</style><b>touch&eacute;</b>&nbsp;&amp; &#x68;&#111;me<!-- hidden -->",
              parsedExamples: [
                { example: "<script>hidden()</script>A &lt;home&gt;.", translation: "<style>.hidden{}</style>家" },
              ],
            },
          ],
        },
      ],
    };

    expect(parseWiktionaryDefinitions(payload, ["English"])).toEqual([
      {
        partOfSpeech: "Noun",
        senses: [{ gloss: "touché & home", examples: [{ sentence: "A <home>.", translation: "家" }], formOf: false }],
      },
    ]);
  });
});

describe("Wiktionary headword forms", () => {
  it("reads multiline headings and headword lines with additional attributes and classes", () => {
    const html = `
      <h3 id="Noun">
        Noun
      </h3>
      <p><span lang="da" class="headword-line extra">
        <strong>hus</strong> <span class="gender"><abbr title="neuter gender">n</abbr></span>
        (<i>plural indefinite</i> <b>huse</b>)
      </span></p>`;

    expect(parseWiktionaryForms(html)).toEqual([
      {
        partOfSpeech: "Noun",
        forms: [
          { label: "gender", value: "neuter" },
          { label: "plural indefinite", value: "huse" },
        ],
      },
    ]);
  });

  it("keeps noun and verb forms in document order and skips alternative forms", () => {
    const html = `
      <h3>Etymology</h3>
      <p><span class="headword-line"><i>plural</i> <b>unclassified</b></span></p>
      <h3>Noun</h3>
      <p><span class="headword-line"><strong>house</strong>
        (<i>plural</i> <b>houses</b> <i>or</i> <b>housen</b> <i>or</i> <b>hice</b>)
      </span></p>
      <h4>Usage notes</h4>
      <p><b>unrelated text</b></p>
      <h3>Verb</h3>
      <p><span class="headword-line"><strong>house</strong>
        (<i>present participle</i> <b>housing</b>, <i>simple past</i> <b>housed</b>)
      </span></p>`;

    expect(parseWiktionaryForms(html)).toEqual([
      { partOfSpeech: "Noun", forms: [{ label: "plural", value: "houses" }] },
      {
        partOfSpeech: "Verb",
        forms: [
          { label: "present participle", value: "housing" },
          { label: "simple past", value: "housed" },
        ],
      },
    ]);
  });

  it("decodes form text and excludes style and script contents", () => {
    const html = `<h3>Verb</h3><p><span class="headword-line">
      <i>past&nbsp;participle<style>.hidden{}</style><script>hidden()</script></i> <b>touch&eacute;</b>
    </span></p>`;

    expect(parseWiktionaryForms(html)).toEqual([
      { partOfSpeech: "Verb", forms: [{ label: "past participle", value: "touché" }] },
    ]);
  });
});

describe("Wiktionary translation tables", () => {
  it("ends a selected etymology's scope at the next sibling heading", () => {
    const wikitext = `==English==
===Etymology 1===
====Noun====
=====Translations=====
{{trans-top|inside}}
* Danish: {{t|da|indenfor}}
{{trans-bottom}}
===Noun===
====Translations====
{{trans-top|outside}}
* Danish: {{t|da|udenfor}}
{{trans-bottom}}`;

    expect(parseWiktionaryTranslationPage(wikitext, { codes: ["da"] }, ["Etymology 1: Noun"]).tables).toMatchObject([
      { words: ["indenfor"] },
    ]);
  });

  it("reads translations from a table headed by trans-top-also", () => {
    const wikitext = `==English==
===Noun===
====Translations====
{{trans-top-also|cloudy diffused matter|mist|steam|fume}}
* Finnish: {{t+|fi|höyry}}
{{trans-bottom}}`;

    expect(parseWiktionaryTranslationPage(wikitext, { codes: ["fi"] }).tables).toMatchObject([
      { partOfSpeech: "Noun", gloss: "cloudy diffused matter", words: ["höyry"] },
    ]);
  });

  it("keeps the display text of piped links in a multiword translation", () => {
    const wikitext = `==English==
===Noun===
====Translations====
{{trans-top|skin tone}}
* Polish: {{tt|pl|[[kolor]] [[skóra|skóry]]|m-in}}
{{trans-bottom}}`;

    expect(parseWiktionaryTranslationPage(wikitext, { codes: ["pl"] }).tables).toMatchObject([
      { words: ["kolor skóry"] },
    ]);
  });
});
