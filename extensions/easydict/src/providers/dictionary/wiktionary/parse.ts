/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { type HTMLElement, parse } from "node-html-parser";

import type { ContentExample } from "@/core/content/types";
import type { WiktionaryLanguage } from "@/core/language/types";
import { md5 } from "@/shared/crypto";

export interface WiktionarySense {
  gloss: string;
  examples: ContentExample[];
  /** Grammatical form of another lemma, eg. `imperative of huse`. */
  formOf: boolean;
}

export interface WiktionaryDefinitionEntry {
  partOfSpeech: string;
  senses: WiktionarySense[];
}

export interface WiktionaryTranslationGroup {
  partOfSpeech?: string;
  gloss: string;
  words: string[];
}

export interface WiktionaryPronunciation {
  /** eg. `[ˈhuˀs]` */
  ipa?: string;
  /** MP3 transcode of the first Commons recording, eg. `Da-kat.ogg`. */
  audioUrl?: string;
}

export interface WiktionaryHeadwordForms {
  partOfSpeech: string;
  forms: { label: string; value: string }[];
}

function htmlToText(html: string | HTMLElement): string {
  const root = typeof html === "string" ? parse(html) : html;
  for (const node of root.querySelectorAll("style, script")) node.remove();
  return root.structuredText.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse the Wiktionary REST `page/definition` payload for one language.
 *
 * eg. https://en.wiktionary.org/api/rest_v1/page/definition/hus
 */
export function parseWiktionaryDefinitions(
  payload: unknown,
  languageNames: readonly string[],
): WiktionaryDefinitionEntry[] {
  if (!isRecord(payload)) return [];
  const entries: WiktionaryDefinitionEntry[] = [];
  for (const languageEntries of Object.values(payload)) {
    if (!Array.isArray(languageEntries)) continue;
    for (const entry of languageEntries) {
      if (!isRecord(entry) || !Array.isArray(entry.definitions)) continue;
      if (typeof entry.language !== "string" || !languageNames.includes(entry.language)) continue;
      const senses: WiktionarySense[] = [];
      for (const definition of entry.definitions.filter(isRecord)) {
        const html = typeof definition.definition === "string" ? definition.definition : "";
        const gloss = htmlToText(html);
        if (!gloss || senses.some((sense) => sense.gloss === gloss)) continue;
        const examples = Array.isArray(definition.parsedExamples)
          ? definition.parsedExamples.filter(isRecord).flatMap(parseExample)
          : [];
        senses.push({ gloss, examples, formOf: html.includes("form-of-definition") });
      }
      if (senses.length) {
        const partOfSpeech = typeof entry.partOfSpeech === "string" ? entry.partOfSpeech : "";
        entries.push({ partOfSpeech, senses });
      }
    }
  }
  return entries;
}

function parseExample(example: Record<string, unknown>): ContentExample[] {
  const sentence = typeof example.example === "string" ? htmlToText(example.example) : "";
  if (!sentence) return [];
  const translation = typeof example.translation === "string" ? htmlToText(example.translation) : "";
  return [translation ? { sentence, translation } : { sentence }];
}

const headingPattern = /^(=+)\s*([^=]+?)\s*\1\s*$/;

/** The level-2 sections of these languages, eg. both `Norwegian Bokmål` and `Norwegian Nynorsk`. */
function getLanguageSection(wikitext: string, languageNames: readonly string[]): string {
  return languageNames.map((languageName) => getSingleLanguageSection(wikitext, languageName)).join("\n");
}

function getSingleLanguageSection(wikitext: string, languageName: string): string {
  const name = languageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return wikitext.split(new RegExp(`^==\\s*${name}\\s*==\\s*$`, "m"))[1]?.split(/^==[^=].*==\s*$/m)[0] ?? "";
}

/**
 * Part-of-speech headings with the headword template under each, eg. `===Noun===\n{{da-noun|et|e}}`.
 *
 * Rendering only these takes about a second; the whole section of a long page such as `house` takes several.
 * Templates between the heading and the first definition are kept; illustrations such as `[[File:…]]` are skipped.
 */
export function getWiktionaryHeadwordWikitext(wikitext: string, languageNames: readonly string[]): string {
  const page = wikitext.replace(/<!--[\s\S]*?-->/g, "");
  return languageNames.flatMap((name) => getHeadwordTemplates(getSingleLanguageSection(page, name))).join("\n");
}

function getHeadwordTemplates(section: string): string[] {
  const lines: string[] = [];
  let heading: string | undefined;
  let headingAdded = false;
  let templateLines: string[] = [];
  let openBraces = 0;

  for (const line of section.split("\n")) {
    const text = line.trim();
    const match = text.match(headingPattern);
    if (match) {
      heading = partsOfSpeech.has(match[2]) ? text : undefined;
      headingAdded = false;
      templateLines = [];
      openBraces = 0;
      continue;
    }
    if (!heading) continue;
    if (!openBraces && text.startsWith("#")) {
      heading = undefined;
      continue;
    }
    if (!openBraces && !text.startsWith("{{")) continue;

    templateLines.push(line);
    for (const [braces] of line.matchAll(/\{\{+|\}\}+/g)) {
      openBraces = Math.max(0, openBraces + (braces[0] === "{" ? braces.length : -braces.length));
    }
    if (!openBraces) {
      if (!headingAdded) lines.push(heading);
      headingAdded = true;
      lines.push(templateLines.join("\n").trim());
      templateLines = [];
    }
  }
  return lines;
}

/**
 * Commons serves an MP3 transcode for each recording, which plays on both macOS and Windows.
 * MP3 uploads have no transcode, so their original file is used.
 *
 * eg. `Da-kat.ogg` → https://upload.wikimedia.org/wikipedia/commons/transcoded/3/35/Da-kat.ogg/Da-kat.ogg.mp3
 */
function getCommonsMP3URL(file: string): string {
  const name = file.trim().replace(/ /g, "_");
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  const hash = md5(title);
  const encoded = encodeURIComponent(title);
  const path = `${hash[0]}/${hash.slice(0, 2)}/${encoded}`;
  return /.mp3$/i.test(title)
    ? `https://upload.wikimedia.org/wikipedia/commons/${path}`
    : `https://upload.wikimedia.org/wikipedia/commons/transcoded/${path}/${encoded}.mp3`;
}

export function parseWiktionaryPronunciation(
  wikitext: string,
  languageNames: readonly string[],
  languageCodes: readonly string[],
): WiktionaryPronunciation {
  const section = getLanguageSection(wikitext, languageNames);
  const templates = (name: string) =>
    [...section.matchAll(new RegExp(`\\{\\{${name}\\|([^}]*)\\}\\}`, "g"))]
      .map(([, body]) => templateArguments(body).map((argument) => argument.trim()))
      .filter(([code]) => languageCodes.includes(code));

  const ipa = templates("IPA")[0]?.[1];
  const audioFile = templates("audio")[0]?.[1];
  return { ipa: ipa || undefined, audioUrl: audioFile ? getCommonsMP3URL(audioFile) : undefined };
}

/**
 * Parse inflections from rendered headword lines, eg. `hus n (singular definite huset, plural indefinite huse)`.
 *
 * Rendered HTML is used because inflection templates such as `{{da-noun|et|e}}` are language-specific.
 */
export function parseWiktionaryForms(html: string): WiktionaryHeadwordForms[] {
  const results: WiktionaryHeadwordForms[] = [];
  let partOfSpeech = "";
  const root = parse(html);

  for (const element of root.querySelectorAll("h3, h4, h5, .headword-line")) {
    if (element.matches("h3, h4, h5")) {
      const text = htmlToText(element);
      if (partsOfSpeech.has(text)) partOfSpeech = text;
      continue;
    }

    const forms: WiktionaryHeadwordForms["forms"] = [];
    const gender = element.querySelector(".gender abbr")?.getAttribute("title");
    if (gender) forms.push({ label: "gender", value: gender.replace(/ gender$/, "") });

    let label = "";
    for (const node of element.querySelectorAll("i, b")) {
      const text = htmlToText(node);
      if (node.tagName === "I") {
        label = text;
      } else if (label === "or") {
        // Alternatives after the first are usually rare or dialectal, eg. `houses or housen or hice`.
        continue;
      } else if (label && text) {
        forms.push({ label, value: text });
      }
    }
    if (forms.length && partOfSpeech) results.push({ partOfSpeech, forms });
  }
  return results;
}

/** Positional template arguments, without named ones such as `id=` or `tr=`. */
function templateArguments(template: string): string[] {
  return template.split("|").filter((argument) => !/^\s*[\w-]+\s*=/.test(argument));
}

function cleanWikiText(text: string): string {
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .trim();
}

const partsOfSpeech = new Set([
  "Noun",
  "Proper noun",
  "Verb",
  "Adjective",
  "Adverb",
  "Pronoun",
  "Preposition",
  "Conjunction",
  "Interjection",
  "Determiner",
  "Article",
  "Numeral",
  "Particle",
  "Phrase",
  "Prepositional phrase",
  "Idiom",
  "Proverb",
  "Prefix",
  "Suffix",
]);

export function hasWiktionaryTranslationSubpage(wikitext: string): boolean {
  return wikitext.includes("{{see translation subpage");
}

/**
 * Parse translation tables (`{{trans-top|gloss}} ... {{t|da|word}} ... {{trans-bottom}}`)
 * from the English section of an English Wiktionary page.
 */
export function parseWiktionaryTranslations(
  wikitext: string,
  { codes, latinOnly }: Pick<WiktionaryLanguage, "codes" | "latinOnly">,
): WiktionaryTranslationGroup[] {
  const englishSection = getLanguageSection(wikitext, ["English"]);
  const groups: WiktionaryTranslationGroup[] = [];
  let partOfSpeech: string | undefined;
  let current: WiktionaryTranslationGroup | undefined;

  for (const line of englishSection.split("\n")) {
    const heading = line.match(/^={3,}\s*([^=]+?)\s*={3,}\s*$/);
    if (heading) {
      if (partsOfSpeech.has(heading[1])) partOfSpeech = heading[1];
      continue;
    }

    const top = line.match(/\{\{trans-top(?:-see)?\|([^}]*)\}\}/);
    if (top) {
      current = { partOfSpeech, gloss: cleanWikiText(templateArguments(top[1])[0] ?? ""), words: [] };
      continue;
    }
    if (/\{\{trans-bottom\}\}/.test(line)) {
      if (current?.words.length) groups.push(current);
      current = undefined;
      continue;
    }
    if (!current) continue;

    for (const [, body] of line.matchAll(/\{\{tt?\+?\|([^}]*)\}\}/g)) {
      const [code, word] = templateArguments(body);
      if (!code || !word || !codes.includes(code.trim())) continue;
      const text = cleanWikiText(word);
      if (latinOnly && /\p{Script=Cyrillic}/u.test(text)) continue;
      if (text && !current.words.includes(text)) current.words.push(text);
    }
  }
  return groups;
}
