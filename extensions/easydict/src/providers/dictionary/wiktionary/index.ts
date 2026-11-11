/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryContent } from "@/core/content/types";
import type { WiktionaryLanguage } from "@/core/language/types";
import { getWiktionaryLanguage } from "@/core/language/utils";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import { RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logTrace } from "@/shared/logger";

import { buildWiktionaryContent } from "./content";
import {
  getWiktionaryHeadwordWikitext,
  hasWiktionaryTranslationSubpage,
  parseWiktionaryDefinitions,
  parseWiktionaryForms,
  parseWiktionaryPronunciation,
  parseWiktionaryTranslations,
  type WiktionaryHeadwordForms,
  type WiktionaryTranslationGroup,
} from "./parse";
import { getWiktionaryEntryURL, getWiktionaryTitle } from "./url";

/** Wikimedia asks API clients to identify themselves. */
const headers = { "User-Agent": "Raycast-Easydict (https://github.com/tisfeng/Raycast-Easydict)" };
const baseURL = "https://en.wiktionary.org";

/**
 * Wiktionary dictionary provider, free and keyless.
 *
 * eg. https://en.wiktionary.org/api/rest_v1/page/definition/hus
 */
export class WiktionaryDictionaryProvider extends BaseDictionaryProvider {
  type = DictionaryType.Wiktionary;

  protected override async doQuery(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): Promise<DictionaryContent> {
    const word = queryWordInfo.word.trim();
    // Wiktionary titles are case-sensitive; sentence-initial capitals are common in selected text.
    const candidates = word === word.toLowerCase() ? [word] : [word, word.toLowerCase()];
    const sourceLanguage = getWiktionaryLanguage(queryWordInfo.fromLanguage);
    const needsTargetTranslation = queryWordInfo.fromLanguage === "en" && queryWordInfo.toLanguage !== "en";
    const targetLanguage = needsTargetTranslation ? getWiktionaryLanguage(queryWordInfo.toLanguage) : undefined;
    for (const candidate of candidates) {
      const query = { ...queryWordInfo, word: candidate };
      const title = getWiktionaryTitle(candidate);
      const [definitionPayload, wikitext] = await Promise.all([
        this.fetchPage(`${baseURL}/api/rest_v1/page/definition/${title}`, "json", signal),
        this.fetchPage(`${baseURL}/w/index.php?title=${title}&action=raw`, "text", signal),
      ]);
      const matches = sourceLanguage.names
        .map((name) => ({ name, entries: parseWiktionaryDefinitions(definitionPayload, [name]) }))
        .filter(({ entries }) => entries.length);
      const definitions = matches.flatMap(({ entries }) => entries);
      const languageNames = matches.length ? matches.map(({ name }) => name) : sourceLanguage.names;
      const page = typeof wikitext === "string" ? wikitext : "";
      if (!definitions.length && (!targetLanguage || !page)) continue;

      const [translations, forms] = await Promise.all([
        targetLanguage ? this.fetchTranslations(title, page, targetLanguage, signal) : [],
        this.fetchForms(title, getWiktionaryHeadwordWikitext(page, languageNames), signal),
      ]);
      const pronunciation = parseWiktionaryPronunciation(page, languageNames, sourceLanguage.codes);
      const content = buildWiktionaryContent(query, { definitions, translations, pronunciation, forms });
      if (content.sections.length) {
        return { ...content, sourceUrl: getWiktionaryEntryURL(candidate, languageNames[0]) };
      }
    }
    return { kind: "dictionary", query: queryWordInfo, sections: [] };
  }

  private async fetchTranslations(
    title: string,
    wikitext: string,
    targetLanguage: WiktionaryLanguage,
    signal?: AbortSignal,
  ): Promise<WiktionaryTranslationGroup[]> {
    const subpage = hasWiktionaryTranslationSubpage(wikitext)
      ? await this.fetchPage(`${baseURL}/w/index.php?title=${title}/translations&action=raw`, "text", signal)
      : undefined;
    return [
      ...(typeof subpage === "string" ? parseWiktionaryTranslations(subpage, targetLanguage) : []),
      ...parseWiktionaryTranslations(wikitext, targetLanguage),
    ];
  }

  /** Renders only the headword templates, whose output carries the inflections; `title` sets their page name. */
  private async fetchForms(
    title: string,
    headwordWikitext: string,
    signal?: AbortSignal,
  ): Promise<WiktionaryHeadwordForms[]> {
    if (!headwordWikitext) return [];
    const payload = await this.fetchPage(
      `${baseURL}/w/api.php?action=parse&title=${title}&prop=text&contentmodel=wikitext&format=json&formatversion=2&disableeditsection=1&disablelimitreport=1`,
      "json",
      signal,
      new URLSearchParams({ text: headwordWikitext }),
    );
    const parsed = typeof payload === "object" && payload !== null && "parse" in payload ? payload.parse : undefined;
    const html = typeof parsed === "object" && parsed !== null && "text" in parsed ? parsed.text : undefined;
    return typeof html === "string" ? parseWiktionaryForms(html) : [];
  }

  /** Missing pages are an ordinary "no entry" result, not a request failure. */
  private async fetchPage(
    url: string,
    responseType: "json" | "text",
    signal?: AbortSignal,
    body?: URLSearchParams,
  ): Promise<unknown> {
    logTrace(this.type, `url: ${url}`);
    const response = await timedFetch.raw(url, {
      headers,
      signal,
      responseType,
      ignoreResponseError: true,
      ...(body && { method: "POST", body }),
    });
    if (response.status === 404) return undefined;
    if (!response.ok)
      throw new RequestError(this.type, `Wiktionary request failed: ${response.status}`, String(response.status));
    return response._data;
  }
}
