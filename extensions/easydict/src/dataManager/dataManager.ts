import { OpenAITranslateResult, QueryWordInfo } from "./../types";
/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-04-25 22:55
 * @fileName: dataManager.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import axios from "axios";
import { getProxyAgent } from "../axiosConfig";
import { detectLanguage } from "../detectLanguage/detect";
import { DetectedLangModel } from "../detectLanguage/types";
import { requestLingueeDictionary } from "../dictionary/linguee/linguee";
import { formatLingueeDisplaySections } from "../dictionary/linguee/parse";
import { updateYoudaoDictionaryDisplay } from "../dictionary/youdao/formatData";
import { playYoudaoWordAudioAfterDownloading, requestYoudaoWebDictionary } from "../dictionary/youdao/youdao";
import { requestYoudaoWebTranslate } from "../dictionary/youdao/youdaoTranslate";
import { englishLanguageItem } from "../language/consts";
import { getAutoSelectedTargetLanguageItem, getLanguageItemFromYoudaoCode } from "../language/languages";
import { LanguageItem } from "../language/type";
import { myPreferences } from "../preferences";
import { appleTranslate } from "../scripts";
import { requestBaiduTextTranslate } from "../translation/baidu/baiduAPI";
import { requestCaiyunTextTranslate } from "../translation/caiyun";
import { requestDeepLTranslate } from "../translation/deepL";
import { requestGoogleTranslate } from "../translation/google";
import { requestWebBingTranslate } from "../translation/microsoft/bing";
import { requestOpenAIStreamTranslate } from "../translation/openAI/chat";
import { requestTencentTranslate } from "../translation/tencent";
import { requestVolcanoTranslate } from "../translation/volcano/volcanoAPI";
import {
  DictionaryType,
  DisplaySection,
  ListAccessoryItem,
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
import { YoudaoDictionaryFormatResult } from "../dictionary/youdao/types";

console.log(`enter dataManager.ts`);

const delayQueryWithProxyTime = 600;

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
  queryWordInfo = {} as QueryWordInfo; // later will must assign value.

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

  abortController?: AbortController;

  delayQueryTimer?: NodeJS.Timeout;
  delayAppleTranslateTimer?: NodeJS.Timeout;
  delayProxyQueryTimer?: NodeJS.Timeout;

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
    console.log(`---> delay query text: ${text}, isDelay: ${isDelay}`);
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

    this.queryBingTranslate(queryWordInfo);
    this.queryBaiduTranslate(queryWordInfo);
    this.queryTencentTranslate(queryWordInfo);
    this.queryVolcanoTranslate(queryWordInfo);
    this.queryCaiyunTranslate(queryWordInfo);
    this.queryOpenAITranslate(queryWordInfo);

    this.delayQuery(queryWordInfo);

    // If no query, stop loading.
    if (this.queryRecordList.length === 0) {
      this.updateLoadingState(false);
    }
  }

  /**
   * Delay query.
   *
   * 1. delay requests that need proxy but if no httpsAgent.
   * 2. delay apple translate.
   */
  private delayQuery(queryWordInfo: QueryWordInfo) {
    this.delayQueryWithProxy(() => {
      // Query Linguee dictionary, will automatically query DeepL translate.
      this.queryLingueeDictionary(queryWordInfo);

      if (myPreferences.enableDeepLTranslate && !myPreferences.enableLingueeDictionary) {
        this.queryDeepLTranslate(queryWordInfo);
      }

      // We need to pass a abort signal, because google translate is used "got" to request, not axios.
      this.queryGoogleTranslate(queryWordInfo, this.abortController);
    });

    // Put Apple translate at the end, because exec Apple Script will block thread, ~0.4s.
    this.delayAppleTranslateTimer = setTimeout(() => {
      this.queryAppleTranslate(queryWordInfo, this.abortController);
      console.log(`after delay apple translate`);
    }, delayQueryWithProxyTime + 100);
  }

  /**
   * Delay query with proxy.
   */
  private delayQueryWithProxy(callback: () => void) {
    if (myPreferences.enableSystemProxy) {
      return callback();
    }

    this.delayProxyQueryTimer = setTimeout(() => {
      console.warn(`delay query with proxy`);
      getProxyAgent().then(() => {
        callback();
      });
    }, delayQueryWithProxyTime);
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

    // clear delay Apple translate.
    if (this.delayAppleTranslateTimer) {
      clearTimeout(this.delayAppleTranslateTimer);
    }

    if (this.delayProxyQueryTimer) {
      clearTimeout(this.delayProxyQueryTimer);
    }
  }

  /**
   * 1. Update query result.
   * 2. Update display sections.
   */
  private updateQueryResultAndSections(queryResult: QueryResult) {
    console.log(`update query sections: ${queryResult.type}`);

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
    console.warn("start queryText: " + text);

    this.updateLoadingState(true);
    this.resetProperties();

    // Todo: need to optimize. Enable to cancel language detect.
    // Todo: record all detect result, maybe can use it as translation result.

    detectLanguage(text).then((detectedLanguage) => {
      console.log(
        `---> final confirmed: ${detectedLanguage.confirmed}, type: ${detectedLanguage.type}, detectLanguage: ${detectedLanguage.youdaoLangCode}`
      );

      // * It takes time to detect the language, in the meantime, user may have cancelled the query.
      if (this.shouldClearQuery) {
        console.log(`---> query has been canceled, stop, return`);
        this.updateLoadingState(false);
        return;
      }

      this.queryTextWithDetectedLanguage(text, toLanguage, detectedLanguage);
    });
  }

  /**
   * Query text with with detected language
   */
  private queryTextWithDetectedLanguage(text: string, toLanguage: string, detectedLanguage: DetectedLangModel) {
    const fromYoudaoLangCode = detectedLanguage.youdaoLangCode;
    console.log("queryTextWithFromLanguageId:", fromYoudaoLangCode);
    this.updateCurrentFromLanguageItem(getLanguageItemFromYoudaoCode(fromYoudaoLangCode));

    // priority to use user selected target language, if conflict, use auto selected target language
    let targetLangCode = toLanguage;
    console.log("userSelectedTargetLanguage:", targetLangCode);
    if (fromYoudaoLangCode === targetLangCode) {
      const targetLanguageItem = getAutoSelectedTargetLanguageItem(fromYoudaoLangCode);
      this.updateAutoSelectedTargetLanguageItem(targetLanguageItem);
      targetLangCode = targetLanguageItem.youdaoLangCode;
      console.log("---> conflict, use autoSelectedTargetLanguage: ", targetLangCode);
    }

    const queryTextInfo: QueryWordInfo = {
      word: text,
      fromLanguage: fromYoudaoLangCode,
      toLanguage: targetLangCode,
    };
    this.queryTextWithTextInfo(queryTextInfo);
  }

  /**
   * Rest properyies before each query.
   */
  private resetProperties() {
    console.log(`resetProperties`);

    this.hasPlayedAudio = false;
    this.isLastQuery = true;
    this.shouldClearQuery = false;
    this.queryRecordList = [];

    const abortController = new AbortController();
    this.abortController = abortController;
    axios.defaults.signal = abortController.signal;
  }

  /**
   * Query Linguee dictionary.
   *
   * For better UI, we use DeepL translate result as Linguee translation result.
   */
  private queryLingueeDictionary(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableLingueeDictionary) {
      const type = DictionaryType.Linguee;
      this.addQueryToRecordList(type);

      requestLingueeDictionary(queryWordInfo)
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

          // * If has Youdao dictionary check if quey text is word, directly use it.
          if (queryWordInfo.isWord !== undefined) {
            lingueeTypeResult.queryWordInfo.isWord = queryWordInfo.isWord;
          }

          // Use Youdao phonetic as Linguee phonetic.
          const accessoryItem: ListAccessoryItem = {
            phonetic: queryWordInfo.phonetic,
            examTypes: queryWordInfo.examTypes,
          };

          lingueeDisplaySections[0].items[0].accessoryItem = accessoryItem;

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

      this.delayQueryWithProxy(() => {
        this.queryDeepLTranslate(queryWordInfo);
      });
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
      const type = queryType ?? DictionaryType.Youdao;
      this.addQueryToRecordList(type);

      requestYoudaoWebDictionary(queryWordInfo, type)
        .then((youdaoDictionaryResult) => {
          // console.log(`---> youdaoDictionaryResult: ${JSON.stringify(youdaoDictionaryResult, null, 4)}`);

          const formatYoudaoResult = youdaoDictionaryResult.result as YoudaoDictionaryFormatResult | undefined;
          if (!formatYoudaoResult) {
            console.warn(`---> formatYoudaoResult is undefined`);
            return;
          }

          const youdaoDisplaySections = updateYoudaoDictionaryDisplay(formatYoudaoResult);

          // * use Youdao dictionary to check if query text is a word.
          Object.assign(queryWordInfo, formatYoudaoResult.queryWordInfo);

          const youdaoDictResult: QueryResult = {
            type: type,
            sourceResult: youdaoDictionaryResult,
            displaySections: youdaoDisplaySections,
          };

          this.updateQueryResultAndSections(youdaoDictResult);

          // if enabled Youdao translate, directly use Youdao API dictionary translate result as Youdao translation.
          if (myPreferences.enableYoudaoTranslate) {
            const translationType = TranslationType.Youdao;

            // * Deep copy Youdao dictionary result, as Youdao translate result.
            const youdaoWebTranslateResult = JSON.parse(JSON.stringify(youdaoDictionaryResult));
            youdaoWebTranslateResult.type = translationType;
            const youdaoTranslationResult: QueryResult = {
              type: translationType,
              sourceResult: youdaoWebTranslateResult,
            };
            this.updateTranslationDisplay(youdaoTranslationResult);
          }

          // Try to update Youdao dictionary translate result, if Youdao translation has finished.
          console.log("---> Try to update Youdao dictionary translate with Youdao translate");

          const youdaoTranslationResult = this.getQueryResult(TranslationType.Youdao);
          if (youdaoTranslationResult) {
            this.updateYoudaoDictionaryTranslation(youdaoTranslationResult.sourceResult.translations);
          }

          // * Note: play audio will block thread, so we need to do it in the end.
          this.downloadAndPlayWordAudio(youdaoDictionaryResult);
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
  private queryGoogleTranslate(queryWordInfo: QueryWordInfo, abortController?: AbortController) {
    if (myPreferences.enableGoogleTranslate) {
      const type = TranslationType.Google;
      this.addQueryToRecordList(type);

      requestGoogleTranslate(queryWordInfo, abortController?.signal)
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
   * Query Bing translate.
   */
  private queryBingTranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableBingTranslate) {
      const type = TranslationType.Bing;
      this.addQueryToRecordList(type);

      requestWebBingTranslate(queryWordInfo)
        .then((bingTypeResult) => {
          const queryResult: QueryResult = {
            type: type,
            sourceResult: bingTypeResult,
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
  private queryAppleTranslate(queryWordInfo: QueryWordInfo, abortController?: AbortController) {
    if (myPreferences.enableAppleTranslate) {
      const type = TranslationType.Apple;
      this.addQueryToRecordList(type);

      appleTranslate(queryWordInfo, abortController)
        .then((translatedText) => {
          if (translatedText) {
            // * Note: apple translateText contains redundant blank line, we need to remove it.
            const translations = translatedText.split("\n").filter((line) => line.length > 0);
            const appleTranslateResult: QueryTypeResult = {
              type: type,
              result: { translatedText: translatedText },
              translations: translations,
              queryWordInfo: queryWordInfo,
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
   * Query Volcano translate.
   */
  private queryVolcanoTranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableVolcanoTranslate) {
      const type = TranslationType.Volcano;
      this.addQueryToRecordList(type);

      requestVolcanoTranslate(queryWordInfo)
        .then((volcanoTypeResult) => {
          const queryResult: QueryResult = {
            type: type,
            sourceResult: volcanoTypeResult,
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
   * * If has enabled Youdao API dictionary, it will directly update Youdao translation after querying Youdao dictionary.
   * * If use Youdao web dictionary, need to update Youdao dictionary translation.
   */
  private queryYoudaoTranslate(queryWordInfo: QueryWordInfo) {
    if (
      (myPreferences.enableYoudaoTranslate && !myPreferences.enableYoudaoDictionary) ||
      myPreferences.enableYoudaoDictionary
    ) {
      const type = TranslationType.Youdao;
      this.addQueryToRecordList(type);

      requestYoudaoWebTranslate(queryWordInfo, type)
        .then((youdaoTypeResult) => {
          youdaoTypeResult.type = type;
          const queryResult: QueryResult = {
            type: type,
            sourceResult: youdaoTypeResult,
            hideDisplay: !myPreferences.enableYoudaoTranslate, // * when use Youdao translation as dictionary translate, hide it.
          };

          // Update Youdao dictionary translation.
          this.updateYoudaoDictionaryTranslation(youdaoTypeResult.translations);
          // Update Youdao translation.
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
   * Query OpenAI translate.
   */
  private queryOpenAITranslate(queryWordInfo: QueryWordInfo) {
    if (myPreferences.enableOpenAITranslate) {
      const type = TranslationType.OpenAI;
      this.addQueryToRecordList(type);

      let openAIQueryResult: QueryResult | undefined;

      queryWordInfo.onMessage = (message) => {
        const resultText = message.content;
        console.warn(`onMessage content: ${message.content}`);
        if (openAIQueryResult) {
          const openAIResult = openAIQueryResult.sourceResult.result as OpenAITranslateResult;
          const translatedText = openAIResult.translatedText + message.content;
          openAIResult.translatedText = translatedText;
          openAIQueryResult.sourceResult.translations = [translatedText];
          this.updateTranslationDisplay(openAIQueryResult);
          console.warn(`onMessage: ${translatedText}`);
        } else {
          openAIQueryResult = {
            type: type,
            sourceResult: {
              type,
              queryWordInfo,
              translations: [resultText],
              result: {
                translatedText: resultText,
              },
            },
          };
          this.updateTranslationDisplay(openAIQueryResult);
        }
      };
      queryWordInfo.onFinish = (value) => {
        console.warn(`onFinish content: ${value}`);

        if (value === "stop") {
          if (openAIQueryResult) {
            const openAIResult = openAIQueryResult.sourceResult.result as OpenAITranslateResult;
            let translatedText = openAIResult.translatedText;
            // If the translated last char contains ["”", '"', "」"], remove it.
            const rightQuotes = ['"', "”", "'", "」"];
            if (translatedText.length > 0) {
              const lastQueryTextChar = queryWordInfo.word[queryWordInfo.word.length - 1];
              const lastTranslatedTextChar = translatedText[translatedText.length - 1];
              if (!rightQuotes.includes(lastQueryTextChar) && rightQuotes.includes(lastTranslatedTextChar)) {
                translatedText = translatedText.slice(0, translatedText.length - 1);
              }
            }

            openAIResult.translatedText = translatedText;
            openAIQueryResult.sourceResult.translations = [translatedText];
            this.updateTranslationDisplay(openAIQueryResult);
            console.warn(`onFinish translatedText: ${translatedText}`);
          }
          this.removeQueryFromRecordList(type);
        }
      };

      requestOpenAIStreamTranslate(queryWordInfo)
        .then(() => {
          // move to onMessage
        })
        .catch((error) => {
          showErrorToast(error);
          this.removeQueryFromRecordList(type);
        })
        .finally(() => {
          // move to onFinish
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

    const showingLoadingState = this.queryRecordList.length > 0;
    this.updateLoadingState(showingLoadingState);

    if (!showingLoadingState) {
      console.log("All queries finished.");
      this.abortController = undefined;
    }
  }

  /**
   * Remove all query from queryRecordList, and update loading status.
   */
  private cancelAndRemoveAllQueries() {
    console.log(`cancel, and remove all query list`);

    this.queryRecordList = [];
    this.updateLoadingState(false);

    this.abortController?.abort();
    this.abortController = undefined;
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

    const oneLineTranslation = sourceResult.translations.join(", ");
    sourceResult.oneLineTranslation = oneLineTranslation;
    let copyText = sourceResult.translations.join("\n");

    // Debug: used for viewing long text log.
    if (environment.isDevelopment && type === TranslationType.Google) {
      const googleResult = sourceResult.result;
      copyText = JSON.stringify(googleResult, null, 4);
    }

    if (oneLineTranslation) {
      let key = `${oneLineTranslation}-${type}`;
      if (type === TranslationType.OpenAI) {
        // Avoid frequent update cause UI flicker.
        key = type;
      }
      const displayItem: ListDisplayItem = {
        displayType: type, // TranslationType
        queryType: type,
        key: key,
        title: ` ${oneLineTranslation}`,
        copyText: copyText,
        queryWordInfo: sourceResult.queryWordInfo,
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
        const lingueeQueryResult = this.getQueryResult(DictionaryType.Linguee);
        this.updateLingueeTranslation(lingueeQueryResult, oneLineTranslation);

        // * Check if need to display DeepL translation.
        newQueryResult.hideDisplay = !myPreferences.enableDeepLTranslate;
        console.log(`---> update deepL translation, disableDisplay: ${newQueryResult.hideDisplay}`);
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
  private updateDictionaryTranslation(dictionaryQueryResult: QueryResult, translations: string[]) {
    const translatedText = translations.join(", ");
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
   * Try to update Youdao dictionary translation, if exist.
   */
  private updateYoudaoDictionaryTranslation(translations: string[]) {
    console.log(`---> try updateYoudaoDictionaryTranslation: ${translations}`);

    const youdaoDictionaryResult = this.getQueryResult(DictionaryType.Youdao);
    if (youdaoDictionaryResult) {
      this.updateDictionaryTranslation(youdaoDictionaryResult, translations);
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
        const wordInfo = sourceResult.queryWordInfo;
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
    console.log(`---> downloadAndPlayWordAudio: ${queryTypeResult.type}`);
    const wordInfo = queryTypeResult.queryWordInfo;
    // console.log(`---> wordInfo: ${JSON.stringify(wordInfo, null, 4)}`);
    const isDictionaryType = checkIsDictionaryType(queryTypeResult.type);
    const isEnglishLanguage = wordInfo.fromLanguage === englishLanguageItem.youdaoLangCode;
    const enableAutomaticDownloadAudio =
      myPreferences.enableAutomaticPlayWordAudio && wordInfo.isWord && isEnglishLanguage;
    if (isDictionaryType && enableAutomaticDownloadAudio && this.isLastQuery && !this.hasPlayedAudio) {
      // Some Youdao web word audio is not accurate, so if not found word audio url from Youdao dictionary, then directly use say command.
      setTimeout(() => {
        // To avoid blocking UI, delay playing audio.
        playYoudaoWordAudioAfterDownloading(wordInfo);
        this.hasPlayedAudio = true;
      }, 50);
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
    // console.log(`childProcess: ${JSON.stringify(this.abortObject.childProcess, null, 4)}`);

    this.cancelAndRemoveAllQueries();
  }
}
