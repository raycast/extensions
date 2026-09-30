/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { batchTranslate } from "google-translate-api-x";

import { networkTimeout } from "@/consts";
import { getLangCode } from "@/core/language/utils";
import { TranslationType } from "@/types/api";
import type { QueryInput, RequestOptions } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";

import { BaseNonStreamingTranslateProvider } from "./base";

// google-translate-api-x requires callers to split text longer than 5000 characters.
const maxChunkLength = 5000;
const sentenceSegmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });

export class GoogleTranslateProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.Google;

  protected async doTranslate(queryWordInfo: QueryInput, { signal }: RequestOptions = {}) {
    const fromLanguageId = getLangCode(queryWordInfo.fromLanguage, "googleLangCode");
    const toLanguageId = getLangCode(queryWordInfo.toLanguage, "googleLangCode");
    const chunks = splitGoogleText(queryWordInfo.word.trim());
    const deadline = AbortSignal.timeout(networkTimeout);
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;

    const response = await batchTranslate(
      chunks.map((chunk) => chunk.text),
      {
        from: fromLanguageId,
        to: toLanguageId,
        requestFunction: async (url: string, options: RequestInit) => {
          const body = await timedFetch(url, {
            ...options,
            signal: requestSignal,
            responseType: "text",
            retry: 0,
          });
          // ofetch consumes the body and normalizes HTTP errors; the RPC parser needs a fresh response.
          return new Response(body);
        },
      },
    ).catch((error: unknown) => {
      if (deadline.aborted && !signal?.aborted) {
        throw new RequestError(this.type, "Google Translate request timed out", "TIMEOUT");
      }
      throw error;
    });

    if (!Array.isArray(response) || response.length !== chunks.length) {
      throw new RequestError(this.type, "Google Translate returned an incomplete translation", "INVALID_RESPONSE");
    }
    const translation = chunks
      .map((chunk, index) => {
        const text = response[index]?.text;
        if (typeof text !== "string" || !text.trim()) {
          throw new RequestError(this.type, "Google Translate returned no translation", "INVALID_RESPONSE");
        }
        return text.trim() + chunk.separator;
      })
      .join("");

    return {
      type: TranslationType.Google,
      translations: translation.split("\n"),
      queryWordInfo,
    };
  }
}

function splitGoogleText(text: string) {
  const chunks: Array<{ text: string; separator: string }> = [];
  while (text.length > maxChunkLength) {
    const window = text.slice(0, maxChunkLength);
    const paragraphEnd = window.lastIndexOf("\n") + 1;
    const sentenceEnd = paragraphEnd ? 0 : (Array.from(sentenceSegmenter.segment(window)).at(-1)?.index ?? 0);
    const wordEnd = window.search(/\s+\S*$/u);
    let end = paragraphEnd || sentenceEnd || (wordEnd > 0 ? wordEnd : maxChunkLength);

    // A forced split must not separate a UTF-16 surrogate pair, such as an emoji.
    const codePoint = text.codePointAt(end - 1);
    if (codePoint !== undefined && codePoint > 0xffff) end--;

    const chunk = text.slice(0, end).trimEnd();
    const rest = text.slice(chunk.length);
    text = rest.trimStart();
    // Preserve paragraph breaks; separate fragments with a space when there was no whitespace.
    const separator = rest.slice(0, rest.length - text.length) || " ";
    chunks.push({ text: chunk, separator });
  }
  chunks.push({ text, separator: "" });
  return chunks;
}
