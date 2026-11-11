import { describe, expect, it, vi } from "vitest";

import { getWiktionaryHeadwordWikitext, parseWiktionaryDefinitions, parseWiktionaryForms } from "./parse";

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
