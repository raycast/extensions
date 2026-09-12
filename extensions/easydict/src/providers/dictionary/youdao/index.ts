/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { autoDetectLanguageItem } from "@/core/language/consts";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import { DictionaryType } from "@/types/api";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/types/query";
import { RequestError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError } from "@/utils/logger";

import { ensureYoudaoCookie } from "./cookie";
import { formatYoudaoDisplaySections, hasYoudaoDictionaryDetails } from "./format";
import { formatYoudaoWebDictionaryModel } from "./formatData";
import type { YoudaoDictionaryData, YoudaoWebDictionaryModel } from "./types";
import { getYoudaoWebDictionaryLanguageId } from "./utils";

// * Cookie will be expired after 1 day, so we need to update it every time we start.
if (myPreferences.enableYoudaoDictionary || myPreferences.enableYoudaoTranslate) {
  ensureYoudaoCookie().catch((error) => logError("Youdao Dictionary", `ensure cookie error: ${error}`));
}

/**
 * Youdao web dictionary provider.
 *
 * Cost time: 0.2s. Supported zh <--> targetLanguage (en, fr, ja, ko).
 */
export class YoudaoDictionaryProvider extends BaseDictionaryProvider<YoudaoDictionaryData> {
  type = DictionaryType.Youdao;

  protected override async doQuery(
    queryWordInfo: QueryInput,
    { signal }: RequestOptions = {},
  ): Promise<DictionaryResult<YoudaoDictionaryData>> {
    // * Note: "fanyi" only works when response dicts has only one item ["meta"]
    const dicts = [["web_trans", "ec", "ce", "newhh", "baike", "wikipedia_digest"]];

    const queryYoudaoDictLanguageId = getYoudaoWebDictionaryLanguageId(queryWordInfo);
    if (!queryYoudaoDictLanguageId) {
      throw new RequestError(DictionaryType.Youdao, "not supported language");
    }

    const params = {
      q: queryWordInfo.word,
      le: queryYoudaoDictLanguageId,
      dicts: JSON.stringify({ count: 99, dicts: dicts }),
    };

    const queryString = new URLSearchParams(params).toString();
    const dictUrl = `https://dict.youdao.com/jsonapi?${queryString}`;

    const youdaoWebModel = await timedFetch<YoudaoWebDictionaryModel>(dictUrl, { signal });
    const parsedResult = formatYoudaoWebDictionaryModel(youdaoWebModel);
    const youdaoQueryWordInfo = parsedResult.queryWordInfo;
    const dictionaryData = parsedResult.result;
    const hasDictionaryDetails = hasYoudaoDictionaryDetails(dictionaryData);

    if (!hasDictionaryDetails) {
      return {
        type: DictionaryType.Youdao,
        queryWordInfo,
      };
    }

    // * Note: Youdao web dict from-to language may be incorrect, eg: 鶗鴂，so we need to update it.
    const shouldKeepDetectedLanguage = queryWordInfo.fromLanguage === autoDetectLanguageItem.youdaoLangCode;
    const resultQueryWordInfo = {
      ...youdaoQueryWordInfo,
      ...(!shouldKeepDetectedLanguage && {
        fromLanguage: queryWordInfo.fromLanguage,
        toLanguage: queryWordInfo.toLanguage,
      }),
    };

    const displaySections = formatYoudaoDisplaySections(resultQueryWordInfo, dictionaryData);

    return {
      type: DictionaryType.Youdao,
      queryWordInfo: resultQueryWordInfo,
      result: dictionaryData,
      displaySections,
    };
  }
}
