/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-20 10:47
 * @fileName: dataManager.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import axios from "axios";
import { detectLanguage } from "../detectLanauge/detect";
import { LanguageDetectTypeResult } from "../detectLanauge/types";
import { rquestLingueeDictionary } from "../dict/linguee/linguee";
import { formatLingueeDisplaySections } from "../dict/linguee/parse";
import { hasYoudaoDictionaryEntries, updateYoudaoDictionaryDisplay } from "../dict/youdao/formatData";
import { QueryWordInfo, YoudaoDictionaryFormatResult } from "../dict/youdao/types";
import { playYoudaoWordAudioAfterDownloading, requestYoudaoDictionary } from "../dict/youdao/youdao";
import { getAutoSelectedTargetLanguageItem, getLanguageItemFromYoudaoId } from "../language/languages";
import { LanguageItem } from "../language/type";
import { myPreferences } from "../preferences";
import { appleTranslate } from "../scripts";
import { requestBaiduTextTranslate } from "../translation/baidu";
import { requestCaiyunTextTranslate } from "../translation/caiyun";
import { requestDeepLTextTranslate as requestDeepLTranslate } from "../translation/deepL";
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
import { showErrorToast } from "../utils";
import {
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
  hasPlayAudio = false;

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
    this.resetProperties();

    const { word: queryText, fromLanguage, toLanguage } = queryWordInfo;
    console.log(`---> query text: ${queryText}`);
    console.log(`---> query fromTo: ${fromLanguage} -> ${toLanguage}`);

    this.queryLingueeDictionary(queryWordInfo);
    this.queryYoudaoDictionary(queryWordInfo);

    // * DeepL translate is used as part of Linguee dictionary.
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

    this.queryRecordList = [];
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
      const shouldDisplay = !queryResult.disableDisplay;
      if (shouldDisplay && queryResult.displaySections) {
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
        console.log(`---> query has been canceld`);
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
    this.hasPlayAudio = false;
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

          // it will update Linguee dictionary section after updating Linguee translation.
          this.updateLingueeTranslation(queryResult);
          // this.updateQueryDisplayResults(queryResult);
          this.downloadAndPlayWordAudio(lingueeTypeResult.wordInfo);
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
  private queryYoudaoDictionary(queryWordInfo: QueryWordInfo) {
    // * Youdao dictionary only support chinese <--> english.
    const youdaoDictionarySet = new Set(["zh-CHS", "zh-CHT", "en"]);
    const isValidYoudaoDictionaryQuery =
      youdaoDictionarySet.has(queryWordInfo.fromLanguage) && youdaoDictionarySet.has(queryWordInfo.toLanguage);
    const enableYoudaoDictionary = myPreferences.enableYoudaoDictionary && isValidYoudaoDictionaryQuery;
    const enableYoudaoTranslate = myPreferences.enableYoudaoTranslate;
    console.log(`---> enable Youdao Dictionary: ${enableYoudaoDictionary}, Translate: ${enableYoudaoTranslate}`);
    if (enableYoudaoDictionary || enableYoudaoTranslate) {
      const type = DicionaryType.Youdao;
      this.addQueryToRecordList(type);

      requestYoudaoDictionary(queryWordInfo)
        .then((youdaoTypeResult) => {
          console.log(`---> youdao result: ${JSON.stringify(youdaoTypeResult.result, null, 2)}`);

          const formatYoudaoResult = youdaoTypeResult.result as YoudaoDictionaryFormatResult;
          const youdaoDisplaySections = updateYoudaoDictionaryDisplay(formatYoudaoResult);
          const showYoudaoDictionary = hasYoudaoDictionaryEntries(formatYoudaoResult);
          console.log(`---> showYoudaoDictionary: ${showYoudaoDictionary}`);

          let displayType;
          if (enableYoudaoTranslate) {
            displayType = TranslationType.Youdao;
          }
          if (enableYoudaoDictionary && showYoudaoDictionary) {
            displayType = DicionaryType.Youdao;
          }
          if (displayType === undefined) {
            console.log("---> no display, return");
            return;
          }
          console.log(`---> type: ${displayType}`);

          youdaoTypeResult.type = displayType;
          const displayResult: QueryResult = {
            type: displayType,
            sourceResult: youdaoTypeResult,
            displaySections: youdaoDisplaySections,
          };

          if (displayType === TranslationType.Youdao) {
            this.updateTranslationDisplay(displayResult);
            return;
          }

          this.updateQueryResultAndSections(displayResult);
          this.downloadAndPlayWordAudio(youdaoTypeResult.wordInfo);
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
        title: oneLineTranslation,
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
        newQueryResult.disableDisplay = !myPreferences.enableDeepLTranslate;
        console.log(`---> update deepL transaltion, disableDisplay: ${newQueryResult.disableDisplay}`);
      }
      this.updateQueryResultAndSections(newQueryResult);
    }
  }

  /**
   * Update Linguee translation.
   *
   * @param translation the translation to update Linguee translation. if translation is empty, use DeepL translation.
   */
  private updateLingueeTranslation(lingueeQueryResult: QueryResult | undefined, translation?: string) {
    if (!lingueeQueryResult) {
      return;
    }

    const lingueeDisplaySections = lingueeQueryResult.displaySections;
    if (lingueeDisplaySections?.length) {
      const firstLingueeDisplayItem = lingueeDisplaySections[0].items[0];
      if (!translation) {
        const deepLQueryResult = this.getQueryResult(TranslationType.DeepL);
        const deepLTranslation = deepLQueryResult?.sourceResult.oneLineTranslation;
        if (deepLTranslation) {
          firstLingueeDisplayItem.title = deepLTranslation;
          console.log(
            `---> deepL translation: ${deepLTranslation}, disableDisplay: ${deepLQueryResult?.disableDisplay}`
          );
        }
      } else {
        firstLingueeDisplayItem.title = translation;
      }
      console.log(`---> linguee translation: ${firstLingueeDisplayItem.title}`);
      this.updateQueryResultAndSections(lingueeQueryResult);
    }
  }

  /**
   * Update Dictionary type section title.
   *
   * 1. Add fromTo language to each dictionary section title.
   * 2. Add fromTo language to the first translation section title.
   */
  private updateTypeSectionTitle() {
    let isFirstTranslation = true;
    this.queryResults.forEach((queryResult) => {
      const { type, sourceResult, displaySections } = queryResult;
      const isDictionaryType = Object.values(DicionaryType).includes(type as DicionaryType);
      const isTranslationType = Object.values(TranslationType).includes(type as TranslationType);

      if (sourceResult && displaySections?.length) {
        const displaySection = displaySections[0];
        const wordInfo = sourceResult.wordInfo;
        const onlyShowEmoji = this.isShowDetail;
        const fromTo = getFromToLanguageTitle(wordInfo.fromLanguage, wordInfo.toLanguage, onlyShowEmoji);
        const simpleSectionTitle = `${sourceResult.type}`;
        const fromToSectionTitle = `${simpleSectionTitle}   (${fromTo})`;
        let sectionTitle = simpleSectionTitle;
        if (isTranslationType) {
          const isShowingTranslationFromTo = isFirstTranslation;
          if (isShowingTranslationFromTo) {
            sectionTitle = fromToSectionTitle;
          }
          isFirstTranslation = false;
        } else if (isDictionaryType) {
          sectionTitle = fromToSectionTitle;
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
  private downloadAndPlayWordAudio(wordInfo: QueryWordInfo) {
    const enableAutomaticDownloadAudio = myPreferences.enableAutomaticPlayWordAudio && wordInfo?.isWord;
    if (enableAutomaticDownloadAudio && this.isLastQuery && !this.hasPlayAudio) {
      playYoudaoWordAudioAfterDownloading(wordInfo);
      this.hasPlayAudio = true;
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
    this.abortObject.abortController?.abort();
    this.abortObject.childProcess?.kill();
  }
}
