/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { networkTimeout } from "@/consts";
import type { DictionaryContent } from "@/core/content/types";
import type { WiktionaryLanguage } from "@/core/language/types";
import { getWiktionaryLanguage } from "@/core/language/utils";
import { DictionaryType } from "@/core/results/kinds";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/core/results/types";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import { normalizeError, RequestError } from "@/shared/errors";
import { timedFetch } from "@/shared/http";
import { logTrace } from "@/shared/logger";

import { buildWiktionaryContent } from "./content";
import {
  getWiktionaryHeadwordWikitext,
  getWiktionarySimplifiedVariantTarget,
  parseWiktionaryDefinitions,
  parseWiktionaryForms,
  parseWiktionaryPronunciation,
  parseWiktionaryTranslationPage,
  type WiktionaryHeadwordForms,
  type WiktionaryTranslationPage,
} from "./parse";
import { getWiktionaryEntryURL, getWiktionaryTitle } from "./url";

/** Wikimedia asks API clients to identify themselves. */
const headers = { "User-Agent": "Raycast-Easydict (https://github.com/tisfeng/Raycast-Easydict)" };
const baseURL = "https://en.wiktionary.org";
const maxReferencedEntries = 3;
const referenceLookupTimeout = 2500;

type TranslationLookup = Pick<WiktionaryTranslationPage, "tables"> & Pick<DictionaryResult, "cacheable">;
type TranslationPageLookup = TranslationLookup & Pick<WiktionaryTranslationPage, "references">;

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
  ): Promise<DictionaryContent | Omit<DictionaryResult, "type">> {
    const word = queryWordInfo.word.trim();
    // Wiktionary titles are case-sensitive; sentence-initial capitals are common in selected text.
    const candidates = word === word.toLowerCase() ? [word] : [word, word.toLowerCase()];
    const sourceLanguage = getWiktionaryLanguage(queryWordInfo.fromLanguage);
    const needsTargetTranslation = queryWordInfo.fromLanguage === "en" && queryWordInfo.toLanguage !== "en";
    const targetLanguage = needsTargetTranslation ? getWiktionaryLanguage(queryWordInfo.toLanguage) : undefined;
    let cacheable: false | undefined;
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
      let definitions = matches.flatMap(({ entries }) => entries);
      const languageNames = matches.length ? matches.map(({ name }) => name) : sourceLanguage.names;
      const page = typeof wikitext === "string" ? wikitext : "";
      if (!definitions.length && languageNames.includes("Chinese")) {
        const target = getWiktionarySimplifiedVariantTarget(page);
        const targetTitle = target && getWiktionaryTitle(target);
        if (targetTitle && targetTitle !== title) {
          const variant = await this.fetchPage(`${baseURL}/api/rest_v1/page/definition/${targetTitle}`, "json", signal);
          definitions = parseWiktionaryDefinitions(variant, ["Chinese"]);
        }
      }
      if (!definitions.length && (!targetLanguage || !page)) continue;

      const [lookup, forms] = await Promise.all([
        targetLanguage ? this.fetchTranslations(title, page, targetLanguage, signal) : undefined,
        this.fetchForms(title, getWiktionaryHeadwordWikitext(page, languageNames), signal),
      ]);
      if (lookup?.cacheable === false) cacheable = false;
      const pronunciation = parseWiktionaryPronunciation(page, languageNames, sourceLanguage.codes);
      const content = buildWiktionaryContent(query, {
        definitions,
        translations: lookup?.tables ?? [],
        pronunciation,
        forms,
      });
      if (content.sections.length) {
        const entry = { ...content, sourceUrl: getWiktionaryEntryURL(candidate, languageNames[0]) };
        return cacheable === false ? { content: entry, cacheable } : entry;
      }
    }
    return { kind: "dictionary", query: queryWordInfo, sections: [] };
  }

  private async fetchTranslations(
    title: string,
    wikitext: string,
    targetLanguage: WiktionaryLanguage,
    signal?: AbortSignal,
  ): Promise<TranslationLookup> {
    const page = await this.readTranslationPage(title, wikitext, targetLanguage, signal, signal);
    if (page.tables.length || !page.references.length) return page;
    const linked = await this.fetchReferencedTables(title, page.references, targetLanguage, signal);
    return { tables: linked.tables, cacheable: page.cacheable ?? linked.cacheable };
  }

  private async fetchReferencedTables(
    title: string,
    pageReferences: WiktionaryTranslationPage["references"],
    targetLanguage: WiktionaryLanguage,
    signal?: AbortSignal,
  ): Promise<TranslationLookup> {
    const deadline = new AbortController();
    const timer = setTimeout(
      () => deadline.abort(new DOMException("Wiktionary translation reference timed out", "TimeoutError")),
      referenceLookupTimeout,
    );
    const requestSignal = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
    const linkedPages = new Map<string, Promise<TranslationLookup>>();
    try {
      const results = await Promise.all(
        pageReferences.map(async ({ title: target, partOfSpeech, gloss, senseId }): Promise<TranslationLookup> => {
          const linkedTitle = getWiktionaryTitle(target);
          if (linkedTitle === title) return { tables: [] };
          let lookup = linkedPages.get(linkedTitle);
          if (!lookup) {
            if (linkedPages.size >= maxReferencedEntries) return { tables: [] };
            lookup = this.readReferencedTranslationPage(linkedTitle, targetLanguage, requestSignal, signal);
            linkedPages.set(linkedTitle, lookup);
          }
          const { tables, cacheable } = await lookup;
          if (senseId) return { tables: tables.filter((table) => table.senseId === senseId), cacheable };
          const matching = tables.filter((table) => !partOfSpeech || table.partOfSpeech === partOfSpeech);
          const sameGloss = matching.filter((table) => table.gloss === gloss);
          return { tables: sameGloss.length ? sameGloss : matching, cacheable };
        }),
      );
      signal?.throwIfAborted();
      return {
        tables: [...new Set(results.flatMap((result) => result.tables))],
        cacheable: results.some((result) => result.cacheable === false) ? false : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async readTranslationPage(
    title: string,
    wikitext: string,
    targetLanguage: WiktionaryLanguage,
    signal: AbortSignal | undefined,
    callerSignal: AbortSignal | undefined,
  ): Promise<TranslationPageLookup> {
    const page = parseWiktionaryTranslationPage(wikitext, targetLanguage);
    if (!page.subpages.length) return page;
    const sectionsByTitle = new Map<string, string[]>();
    for (const { section, title: target } of page.subpages) {
      const subpageTitle = target ? getWiktionaryTitle(target) : title;
      const sections = sectionsByTitle.get(subpageTitle) ?? [];
      sections.push(section);
      sectionsByTitle.set(subpageTitle, sections);
    }
    const subpages = await Promise.all(
      Array.from(sectionsByTitle, async ([subpageTitle, sections]) => {
        const { wikitext: raw, cacheable } = await this.fetchOptionalTranslationText(
          `${subpageTitle}/translations`,
          signal,
          callerSignal,
        );
        const parsed = raw === undefined ? undefined : parseWiktionaryTranslationPage(raw, targetLanguage, sections);
        return { parsed, cacheable };
      }),
    );
    return {
      tables: [...subpages.flatMap(({ parsed }) => parsed?.tables ?? []), ...page.tables],
      references: [...subpages.flatMap(({ parsed }) => parsed?.references ?? []), ...page.references],
      cacheable: subpages.some((subpage) => subpage.cacheable === false) ? false : undefined,
    };
  }

  private async readReferencedTranslationPage(
    title: string,
    targetLanguage: WiktionaryLanguage,
    signal: AbortSignal,
    callerSignal?: AbortSignal,
  ): Promise<TranslationLookup> {
    const { wikitext, cacheable } = await this.fetchOptionalTranslationText(title, signal, callerSignal);
    return wikitext === undefined
      ? { tables: [], cacheable }
      : this.readTranslationPage(title, wikitext, targetLanguage, signal, callerSignal);
  }

  private async fetchOptionalTranslationText(
    title: string,
    signal: AbortSignal | undefined,
    callerSignal: AbortSignal | undefined,
  ): Promise<{ wikitext?: string; cacheable?: false }> {
    try {
      signal?.throwIfAborted();
      const raw = await this.fetchPage(`${baseURL}/w/index.php?title=${title}&action=raw`, "text", signal);
      return typeof raw === "string" ? { wikitext: raw } : {};
    } catch (error) {
      callerSignal?.throwIfAborted();
      const { name, message } = normalizeError(error);
      if (!signal?.aborted && (name === "AbortError" || name === "CancelledError")) throw error;
      logTrace(this.type, `Wiktionary translation page ${title} failed: ${message}`);
      return { cacheable: false };
    }
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
    const deadline = AbortSignal.timeout(networkTimeout);
    const response = await timedFetch.raw(url, {
      headers,
      signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
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
