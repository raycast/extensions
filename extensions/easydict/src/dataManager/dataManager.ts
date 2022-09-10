/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-03 00:32
 * @fileName: dataManager.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import axios from "axios";
import { detectLanguage } from "../detectLanauge/detect";
import { LanguageDetectTypeResult } from "../detectLanauge/types";
import { rquestLingueeDictionary } from "../dictionary/linguee/linguee";
import { formatLingueeDisplaySections } from "../dictionary/linguee/parse";
import { updateYoudaoDictionaryDisplay } from "../dictionary/youdao/formatData";
import { QueryWordInfo, YoudaoDictionaryFormatResult } from "../dictionary/youdao/types";
import {
  playYoudaoWordAudioAfterDownloading,
  requestYoudaoApiDictionaryTranslate,
  requestYoudaoWebDictionary,
  requestYoudaoWebTranslate,
} from "../dictionary/youdao/youdao";
import { getAutoSelectedTargetLanguageItem, getLanguageItemFromYoudaoId } from "../language/languages";
import { LanguageItem } from "../language/type";
import { KeyStore, myPreferences } from "../preferences";
import { appleTranslate } from "../scripts";
import { requestBaiduTextTranslate } from "../translation/baidu";
import { requestCaiyunTextTranslate } from "../translation/caiyun";
import { requestDeepLTranslate } from "../translation/deepL";
import { requestGoogleTranslate } from "../translation/google";
import { requestTencentTranslate } from "../translation/tencent";
import {
  AbortObject,
  DicionaryType,
  DisplaySection,
  ListDisplayItem,
  QueryResult,
  QueryType,
  QueryTypeResult,
  TranslationType,
} from "../types";
import { checkIsDictionaryType, checkIsTranslationType, showErrorToast } from "../utils";
import {
  checkIfEnableYoudaoDictionary,
  checkIfShowTranslationDetail,
  getFromToLanguageTitle,
  sortedQueryResults,
  updateTranslationMarkdown,
} from "./utils";

/**
 * Data manager.
 *
 * Todo: need to optimize.
 * - data manager.
 * - data request.
 * - data handle.
 */
export class DataManager {
  // some callback functions.
  updateListDisplaySections: (displaySections: DisplaySection[]) => void = () => {
    // later will assign callback.
  };
  updateLoadingState: (isLoadingState: boolean) => void = () => {
    // later will assign callback.
  };
  updateCurrentFromLanguageItem: (languageItem: LanguageItem) => void = () => {
    // later will assign callback.
  };
  updateAutoSelectedTargetLanguageItem: (languageItem: LanguageItem) => void = () => {
    // later will assign callback.
  };

  queryResults: QueryResult[] = [];
  queryWordInfo = {} as QueryWordInfo; // later will must assign value

  /**
   * when has new input text, need to cancel previous request.
   */
  isLastQuery = true;
  /**
   * when input text is empty, need to cancel previous request, and clear result.
   */
  shouldClearQuery = true;

  /**
   * Show detail of translation. Only dictionary is empty, and translation is too long, then show detail.
   */
  isShowDetail = false;
  hasPlayedAudio = false;
  enableYoudaoDictionary = true;

  abortObject: AbortObject = {};

  delayQueryTimer?: NodeJS.Timeout;
  /**
   * Delay the time to call the query API. Since API has frequency limit.
   *
   * * Note
   * In the actual test, the request interval of 600ms is more appropriate。
   * But due to the addition of language recognition function in the middle, it takes about 400ms.
   * Considering that the language recognition api also needs to be frequency limited.
   * In the end, conservative, we still set delayRequestTime to 600ms.
   */
  delayRequestTime = 600;

  /**
   * Used for recording all the query types. If start a new query, push it to the array, when finished, remove it.
   */
  queryRecordList: QueryType[] = [];

  /**
   * Delay the time to call the query API. Since API has frequency limit.
   */
  public delayQueryText(text: string, toLanguage: string, isDelay: boolean) {
    console.log(`---> delay query text: ${text}`);
    const delayTime = isDelay ? this.delayRequestTime : 0;
    this.delayQueryTimer = setTimeout(() => {
      this.queryText(text, toLanguage);
    }, delayTime);
  }

  /**
   * Query text with text info, query dictionary API or translate API.
   *
   * * Note: please do not change this function pararm.
   */
  public queryTextWithTextInfo(queryWordInfo: QueryWordInfo) {
    this.queryWordInfo = queryWordInfo;
    this.enableYoudaoDictionary = checkIfEnableYoudaoDictionary(this.queryWordInfo);

    this.resetProperties();

    const { word, fromLanguage, toLanguage } = queryWordInfo;
    console.log(`---> query text: ${word}`);
    console.log(`---> query fromTo: ${fromLanguage} -> ${toLanguage}`);

    // Todo: handle cancel request, add reject(undefined) to the catch.
    this.queryYoudaoDictionary(queryWordInfo);
    this.queryYoudaoTranslate(queryWordInfo);

    // query Linguee dictionary, will automatically query DeepL translate.
    this.queryLingueeDictionary(queryWordInfo);
    if (myPreferences.enableDeepLTranslate && !myPreferences.enableLingueeDictionary) {
      this.queryDeepLTranslate(queryWordInfo);
    }

    // We need to pass a abort signal, becase google translate is used "got" to request, not axios.
    this.queryGoogleTranslate(queryWordInfo, this.abortObject.abortController?.signal);
    this.queryAppleTranslate(queryWordInfo, this.abortObject);
    this.queryBaiduTranslate(queryWordInfo);
    this.queryTencentTranslate(queryWordInfo);
    this.queryCaiyunTranslate(queryWordInfo);

    // If no query, stop loading.
    if (this.queryRecordList.length === 0) {
      this.updateLoadingState(false);
    }
  }

  /**
   * Clear query result.
   */
  public clearQueryResult() {
    // console.log(`---> clear query result`);

    this.cancelCurrentQuery();

    if (this.delayQueryTimer) {
      clearTimeout(this.delayQueryTimer);
    }

    this.isShowDetail = false;
    this.shouldClearQuery = true;
    this.isLastQuery = false;
    this.updateLoadingState(false);

    this.queryResults = [];
    this.updateListDisplaySections([]);
  }

  /**
   * 1. Update query result.
   * 2. Update display sections.
   */
  private updateQueryResultAndSections(queryResult: QueryResult) {
    this.updateQueryResult(queryResult);
    this.updateDataDisplaySections();
  }

  /**
   * update query result.
   *
   * 1.push new result to queryResults.
   * 2.sort queryResults.
   * 3.update dictionary section title.
   */
  private updateQueryResult(queryResult: QueryResult) {
    this.queryResults.push(queryResult);
    this.queryResults = sortedQueryResults(this.queryResults);
  }

  /**
   * 1. Update isShowDetail。
   * 2. Update section title.
   * 3. Update displaySections
   * 4. callback updateListDisplaySections.
   */
  private updateDataDisplaySections() {
    this.isShowDetail = checkIfShowTranslationDetail(this.queryResults);
    this.updateTypeSectionTitle();

    const displaySections: DisplaySection[][] = [];
    for (const queryResult of this.queryResults) {
      const shouldDisplay = !queryResult.hideDisplay;
      if (shouldDisplay && queryResult.displaySections?.length) {
        // console.log(`---> update display sections: ${queryResult.type}, length: ${queryResult.displaySections.length}`);
        updateTranslationMarkdown(queryResult, this.queryResults);
        displaySections.push(queryResult.displaySections);
      }
    }
    this.updateListDisplaySections(displaySections.flat());
  }

  /**
   * Query text, automatically detect the language of input text
   */
  private queryText(text: string, toLanguage: string) {
    console.log("start queryText: " + text);

    this.updateLoadingState(true);
    this.resetProperties();

    // Todo: need to optimize. Enable to cancel language detect.
    // Todo: record all detect result, maybe can use it as translation result.
    detectLanguage(text, (detectedLanguageResult) => {
      console.log(
        `---> final confirmed: ${detectedLanguageResult.confirmed}, type: ${detectedLanguageResult.type}, detectLanguage: ${detectedLanguageResult.youdaoLanguageId}`
      );

      // * It takes time to detect the language, in the meantime, user may have cancelled the query.
      if (this.shouldClearQuery) {
        console.log(`---> query has been canceled, stop, return`);
        this.updateLoadingState(false);
        return;
      }

      this.queryTextWithDetectedLanguage(text, toLanguage, detectedLanguageResult);
    });
  }

  /**
   * Query text with with detected language
   */
  private queryTextWithDetectedLanguage(text: string, toLanguage: string, detectedLanguage: LanguageDetectTypeResult) {
    const fromYoudaoLanguageId = detectedLanguage.youdaoLanguageId;
    console.log("queryTextWithFromLanguageId:", fromYoudaoLanguageId);
    this.updateCurrentFromLanguageItem(getLanguageItemFromYoudaoId(fromYoudaoLanguageId));

    // priority to use user selected target language, if conflict, use auto selected target language
    let targetLanguageId = toLanguage;
    console.log("userSelectedTargetLanguage:", targetLanguageId);
    if (fromYoudaoLanguageId === targetLanguageId) {
      const targetLanguageItem = getAutoSelectedTargetLanguageItem(fromYoudaoLanguageId);
      this.updateAutoSelectedTargetLanguageItem(targetLanguageItem);
      targetLanguageId = targetLanguageItem.youdaoId;
      console.log("---> conflict, use autoSelectedTargetLanguage: ", targetLanguageId);
    }

    const queryTextInfo: QueryWordInfo = {
      word: text,
      fromLanguage: fromYoudaoLanguageId,
      toLanguage: targetLanguageId,
    };
    this.queryTextWithTextInfo(queryTextInfo);
  }

  /**
   * Rest properyies before each query.
   */
  private resetProperties() {
    this.hasPlayedAudio = false;
    this.isLastQuery = true;
    this.shouldClearQuery = false;
    this.queryRecordList = [];

    const abortController = new AbortController();
    this.abortObject.abortController = abortController;
    axios.defaults.signal = abortController.signal;
  }

  /**
   * Query Linguee dictionary.
   *
   * For better UI, we use DeepL translate result as Linguee translation result.
   */
  private queryLingueeDictionary(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableLingueeDictionary) {
      const type = DicionaryType.Linguee;
      this.addQueryToRecordList(type);

      rquestLingueeDictionary(queryWordInfo)
        .then((lingueeTypeResult) => {
          const lingueeDisplaySections = formatLingueeDisplaySections(lingueeTypeResult);
          if (lingueeDisplaySections.length === 0) {
            return;
          }

          const queryResult: QueryResult = {
            type: type,
            displaySections: lingueeDisplaySections,
            sourceResult: lingueeTypeResult,
          };

          // try use DeepL translate result as Linguee translation.
          this.updateLingueeTranslation(queryResult);
          this.updateQueryResultAndSections(queryResult);

          this.downloadAndPlayWordAudio(lingueeTypeResult);
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
          this.updateDataDisplaySections();
        });

      // at the same time, query DeepL translate.
      this.queryDeepLTranslate(queryWordInfo);
    }
  }

  /**
   * Query DeepL translate. If has enabled Linguee dictionary, don't need to query DeepL.
   */
  private queryDeepLTranslate(queryWordInfo: QueryWordInfo) {
    const type = TranslationType.DeepL;
    this.addQueryToRecordList(type);

    requestDeepLTranslate(queryWordInfo)
      .then((deepLTypeResult) => {
        const queryResult: QueryResult = {
          type: type,
          sourceResult: deepLTypeResult,
        };
        this.updateTranslationDisplay(queryResult);
      })
      .catch((error) => {
        if (!myPreferences.enableDeepLTranslate) {
          return;
        }
        showErrorToast(error);
      })
      .finally(() => {
        this.removeQueryFromRecordList(type);
      });
  }

  /**
   * Query Youdao dictionary.
   */
  private queryYoudaoDictionary(queryWordInfo: QueryWordInfo, queryType?: QueryType) {
    if (this.enableYoudaoDictionary) {
      const type = queryType ?? DicionaryType.Youdao;
      this.addQueryToRecordList(type);

      // If user has Youdao API key, use official API, otherwise use web API.
      const youdaoDictionayFnPtr = KeyStore.youdaoAppId
        ? requestYoudaoApiDictionaryTranslate
        : requestYoudaoWebDictionary;
      const requestFunctionList = [youdaoDictionayFnPtr];
      if (youdaoDictionayFnPtr === requestYoudaoWebDictionary) {
        requestFunctionList.push(requestYoudaoWebTranslate);
      }
      const requests = requestFunctionList.map((request) => request(queryWordInfo, type));

      Promise.all(requests)
        .then(([youdaoDictionaryResult, youdaoWebTranslateResult]) => {
          console.log(`---> youdaoDictionaryResult: ${JSON.stringify(youdaoDictionaryResult, null, 2)}`);
          console.log(`---> youdaoWebTranslateResult: ${JSON.stringify(youdaoWebTranslateResult, null, 2)}`);

          const formatYoudaoResult = youdaoDictionaryResult.result as YoudaoDictionaryFormatResult | undefined;
          const youdaoDisplaySections = updateYoudaoDictionaryDisplay(formatYoudaoResult);

          const youdaoDictResult: QueryResult = {
            type: type,
            sourceResult: youdaoDictionaryResult,
            displaySections: youdaoDisplaySections,
          };

          if (youdaoWebTranslateResult) {
            const translatedText = youdaoWebTranslateResult.translations.join(", ");
            this.updateDictionaryTranslation(youdaoDictResult, translatedText);
          }

          this.updateQueryResultAndSections(youdaoDictResult);
          this.downloadAndPlayWordAudio(youdaoDictionaryResult);

          // if enabled Youdao translate, directly use Youdao dictionary translate result as Youdao translation.
          if (myPreferences.enableYoudaoTranslate) {
            const translationType = TranslationType.Youdao;
            youdaoWebTranslateResult.type = translationType;
            const youdaoTranslationResult: QueryResult = {
              type: translationType,
              sourceResult: youdaoWebTranslateResult,
            };
            this.updateTranslationDisplay(youdaoTranslationResult);
          }
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Query google translate.
   */
  private queryGoogleTranslate(queryWordInfo: QueryWordInfo, signal: AbortSignal | undefined) {
    if (myPreferences.enableGoogleTranslate) {
      const type = TranslationType.Google;
      this.addQueryToRecordList(type);

      requestGoogleTranslate(queryWordInfo, signal)
        .then((googleTypeResult) => {
          const queryResult: QueryResult = {
            type: type,
            sourceResult: googleTypeResult,
          };
          this.updateTranslationDisplay(queryResult);
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Query apple translate.
   */
  private queryAppleTranslate(queryWordInfo: QueryWordInfo, abortObject: AbortObject | undefined) {
    if (myPreferences.enableAppleTranslate) {
      const type = TranslationType.Apple;
      this.addQueryToRecordList(type);

      appleTranslate(queryWordInfo, abortObject)
        .then((translatedText) => {
          if (translatedText) {
            // * Note: apple translateText contains redundant blank line, we need to remove it.
            const translations = translatedText.split("\n").filter((line) => line.length > 0);
            const appleTranslateResult: QueryTypeResult = {
              type: type,
              result: { translatedText: translatedText },
              translations: translations,
              wordInfo: queryWordInfo,
            };
            const queryResult: QueryResult = {
              type: type,
              sourceResult: appleTranslateResult,
            };
            this.updateTranslationDisplay(queryResult);
          }
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Query baidu translate API.
   *
   * Todo: need to optimize, thoese translation functions are similar.
   */
  private queryBaiduTranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableBaiduTranslate) {
      const type = TranslationType.Baidu;
      this.addQueryToRecordList(type);

      requestBaiduTextTranslate(queryWordInfo)
        .then((baiduTypeResult) => {
          const queryResult: QueryResult = {
            type: type,
            sourceResult: baiduTypeResult,
          };
          this.updateTranslationDisplay(queryResult);
        })
        .catch((err) => {
          showErrorToast(err);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Query tencent translate.
   */
  private queryTencentTranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableTencentTranslate) {
      const type = TranslationType.Tencent;
      this.addQueryToRecordList(type);

      requestTencentTranslate(queryWordInfo)
        .then((tencentTypeResult) => {
          const queryResult: QueryResult = {
            type: type,
            sourceResult: tencentTypeResult,
          };
          this.updateTranslationDisplay(queryResult);
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Query Youdao translate.
   *
   * * If has enabled Youdao dictionary, it will directly update Youdao translation after querying Youdao dictionary.
   */
  private queryYoudaoTranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableYoudaoTranslate && !this.enableYoudaoDictionary) {
      const type = TranslationType.Youdao;
      this.addQueryToRecordList(type);

      // * If user has Youdao API key, use official API, otherwise use web API.
      const youdaoTranslateFnPtr = KeyStore.youdaoAppId
        ? requestYoudaoApiDictionaryTranslate
        : requestYoudaoWebTranslate;
      youdaoTranslateFnPtr(queryWordInfo, type)
        .then((youdaoTypeResult) => {
          youdaoTypeResult.type = type;
          const queryResult: QueryResult = {
            type: type,
            sourceResult: youdaoTypeResult,
          };
          this.updateTranslationDisplay(queryResult);
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Query caiyun translate.
   */
  private queryCaiyunTranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableCaiyunTranslate) {
      const type = TranslationType.Caiyun;
      this.addQueryToRecordList(type);

      requestCaiyunTextTranslate(queryWordInfo)
        .then((caiyunTypeResult) => {
          const queryResult: QueryResult = {
            type: type,
            sourceResult: caiyunTypeResult,
          };
          this.updateTranslationDisplay(queryResult);
        })
        .catch((error) => {
          showErrorToast(error);
        })
        .finally(() => {
          this.removeQueryFromRecordList(type);
        });
    }
  }

  /**
   * Add query to record list, and update loading status.
   */
  private addQueryToRecordList(type: QueryType) {
    this.queryRecordList.push(type);
    this.updateLoadingState(true);
  }

  /**
   * Remove query type from queryRecordList, and update loading status.
   */
  private removeQueryFromRecordList(type: QueryType) {
    this.queryRecordList = this.queryRecordList.filter((queryType) => queryType !== type);
    // console.log(`queryRecordList: ${this.queryRecordList}`);

    const isLoadingState = this.queryRecordList.length > 0;
    this.updateLoadingState(isLoadingState);
  }

  /**
   * Update the translation display.
   *
   * * If sourceResult.result exist, then will call this.updateRequestDisplayResults()
   */
  private updateTranslationDisplay(queryResult: QueryResult) {
    const { type, sourceResult } = queryResult;
    console.log(`---> updateTranslationDisplay: ${type}`);
    if (!sourceResult.result) {
      console.warn(`---> ${type} result is empty.`);
      return;
    }

    const oneLineTranslation = sourceResult.translations.map((translation) => translation).join(", ");
    sourceResult.oneLineTranslation = oneLineTranslation;
    let copyText = oneLineTranslation;

    // Debug: used for viewing long text log.
    if (environment.isDevelopment && type === TranslationType.Google) {
      const googleResult = sourceResult.result;
      copyText = JSON.stringify(googleResult, null, 4);
    }

    if (oneLineTranslation) {
      const displayItem: ListDisplayItem = {
        displayType: type, // TranslationType
        queryType: type,
        key: `${oneLineTranslation}-${type}`,
        title: ` ${oneLineTranslation}`,
        copyText: copyText,
        queryWordInfo: sourceResult.wordInfo,
      };
      const displaySections: DisplaySection[] = [
        {
          type: type,
          sectionTitle: type,
          items: [displayItem],
        },
      ];
      const newQueryResult: QueryResult = {
        ...queryResult,
        displaySections: displaySections,
      };

      // this is Linguee dictionary query, we need to check to update Linguee translation.
      if (type === TranslationType.DeepL) {
        const lingueeQueryResult = this.getQueryResult(DicionaryType.Linguee);
        this.updateLingueeTranslation(lingueeQueryResult, oneLineTranslation);

        // * Check if need to display DeepL translation.
        newQueryResult.hideDisplay = !myPreferences.enableDeepLTranslate;
        console.log(`---> update deepL transaltion, disableDisplay: ${newQueryResult.hideDisplay}`);
      }
      this.updateQueryResultAndSections(newQueryResult);
    }
  }

  /**
   * Update Linguee translation.
   *
   * @param translatedText the translation to update Linguee translation. if translatedText is empty, means use DeepL translation.
   */
  private updateLingueeTranslation(lingueeQueryResult: QueryResult | undefined, translatedText?: string) {
    if (!lingueeQueryResult) {
      return;
    }

    const lingueeDisplaySections = lingueeQueryResult.displaySections;
    if (lingueeDisplaySections?.length) {
      const firstLingueeDisplayItem = lingueeDisplaySections[0].items[0];
      if (!translatedText) {
        const deepLQueryResult = this.getQueryResult(TranslationType.DeepL);
        const deepLTranslation = deepLQueryResult?.sourceResult.oneLineTranslation;
        if (deepLTranslation) {
          firstLingueeDisplayItem.title = deepLTranslation;
        }
      } else {
        firstLingueeDisplayItem.title = translatedText;
        firstLingueeDisplayItem.copyText = translatedText;
      }
      console.log(`---> update linguee translation: ${firstLingueeDisplayItem.title}`);
    }
  }

  /**
   * Update dictionary translation.
   *
   * * Only dictionaryDisplaySections length > 1, enable update
   */
  private updateDictionaryTranslation(dictionaryQueryResult: QueryResult, translatedText: string) {
    console.log(`---> try updateDictionaryTranslation: ${translatedText}`);
    const dictionaryDisplaySections = dictionaryQueryResult.displaySections;
    if (dictionaryDisplaySections?.length) {
      if (dictionaryDisplaySections.length < 2) {
        return;
      }

      const firstDictionaryDisplayItem = dictionaryDisplaySections[0].items[0];
      firstDictionaryDisplayItem.title = translatedText;
      firstDictionaryDisplayItem.copyText = translatedText;
      console.log(`---> update dictionary translation: ${translatedText}`);
    }
  }

  /**
   * Update Dictionary type section title.
   *
   * 1. Add fromTo language to each `Dictionary` section title.
   * 2. Add fromTo language to the `Translation` section title, only if preivious section is not translation section.
   */
  private updateTypeSectionTitle() {
    let isPreviousSectionTranslationType = false;
    this.queryResults.forEach((queryResult) => {
      const { type, sourceResult, displaySections } = queryResult;
      const isDictionaryType = checkIsDictionaryType(type);
      const isTranslationType = checkIsTranslationType(type);

      if (sourceResult && displaySections?.length) {
        const displaySection = displaySections[0];
        const wordInfo = sourceResult.wordInfo;
        const onlyShowEmoji = this.isShowDetail;
        const fromTo = getFromToLanguageTitle(wordInfo.fromLanguage, wordInfo.toLanguage, onlyShowEmoji);
        const simpleSectionTitle = `${sourceResult.type}`;
        const fromToSectionTitle = `${simpleSectionTitle}   (${fromTo})`;
        let sectionTitle = simpleSectionTitle;
        if (isTranslationType) {
          if (!isPreviousSectionTranslationType) {
            sectionTitle = fromToSectionTitle;
          }
          isPreviousSectionTranslationType = true;
        } else {
          if (isDictionaryType) {
            sectionTitle = fromToSectionTitle;
          }
          isPreviousSectionTranslationType = false;
        }
        displaySection.sectionTitle = sectionTitle;
      }
    });
  }

  /**
   * Download word audio and play it.
   *
   * if is dictionary, and enable automatic play audio and query is word, then download audio and play it.
   */
  private downloadAndPlayWordAudio(queryTypeResult: QueryTypeResult) {
    const wordInfo = queryTypeResult.wordInfo;
    const isDictionaryType = checkIsDictionaryType(queryTypeResult.type);
    const enableAutomaticDownloadAudio = myPreferences.enableAutomaticPlayWordAudio && wordInfo.isWord;
    if (isDictionaryType && enableAutomaticDownloadAudio && this.isLastQuery && !this.hasPlayedAudio) {
      playYoudaoWordAudioAfterDownloading(wordInfo);
      this.hasPlayedAudio = true;
    }
  }

  /**
   * Get query result according query type from queryResults.
   */
  private getQueryResult(queryType: QueryType) {
    for (const result of this.queryResults) {
      if (queryType === result.type) {
        return result;
      }
    }
  }

  /**
   * Cancel current query.
   */
  private cancelCurrentQuery() {
    // console.warn(`---> cancel current query`);
    // console.log(`childProcess: ${JSON.stringify(this.abortObject.childProcess, null, 2)}`);

    this.abortObject.abortController?.abort();
    this.abortObject.childProcess?.kill();
  }
}
