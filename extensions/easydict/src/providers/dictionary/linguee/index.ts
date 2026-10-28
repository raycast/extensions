/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { userAgent } from "@/consts";
import type { DictionaryContent } from "@/core/content/types";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions } from "@/core/results/types";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import { timedFetch } from "@/shared/http";
import { logTrace } from "@/shared/logger";

import { buildLingueeContent } from "./content";
import { parseLingueeHTML } from "./parse";
import { getLingueeWebDictionaryURL } from "./url";

/**
 * Linguee dictionary provider.
 *
 * Cost time: > 2s.
 * eg. good: https://www.linguee.com/english-chinese/search?source=auto&query=good
 */
export class LingueeDictionaryProvider extends BaseDictionaryProvider {
  type = DictionaryType.Linguee;

  protected override async doQuery(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): Promise<DictionaryContent> {
    const lingueeUrl = getLingueeWebDictionaryURL(queryWordInfo);
    logTrace(this.type, `url: ${lingueeUrl}`);

    if (!lingueeUrl) {
      return { kind: "dictionary", query: queryWordInfo, sections: [] };
    }

    const response = await timedFetch.raw(lingueeUrl, {
      headers: { "User-Agent": userAgent },
      signal,
      responseType: "arrayBuffer",
    });

    const contentType = response.headers.get("content-type");
    const arrayBuffer = response._data;
    if (!arrayBuffer) {
      throw new Error("No data received from Linguee");
    }
    const data = Buffer.from(arrayBuffer);
    const html = data.toString(
      typeof contentType === "string" && contentType.includes("iso-8859-15") ? "latin1" : "utf-8",
    );
    return buildLingueeContent(queryWordInfo, parseLingueeHTML(html));
  }
}
