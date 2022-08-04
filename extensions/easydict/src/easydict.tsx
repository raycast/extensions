/*
 * @author: tisfeng
 * @createTime: 2022-06-23 14:19
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-31 23:08
 * @fileName: easydict.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Action, ActionPanel, Color, getSelectedText, Icon, List, showToast, Toast } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import { ActionFeedback, getListItemIcon, getWordAccessories, ListActionPanel } from "./components";
import { BaiduRequestStateCode, youdaoErrorCodeUrl, YoudaoRequestStateCode } from "./consts";
import { detectLanguage } from "./detectLanguage";
import { playYoudaoWordAudioAfterDownloading } from "./dict/youdao/request";
import {
  formatTranslateDisplayResult,
  formatYoudaoDictionaryResult,
  updateFormatResultWithAppleTranslateResult,
  updateFormatResultWithBaiduTranslation,
  updateFormatResultWithCaiyunTranslation,
  updateFormatResultWithTencentTranslation,
  updateFormatTranslateResultWithDeepLResult,
  updateFormatTranslateResultWithGoogleResult,
} from "./formatData";
import { requestGoogleTranslate } from "./google";
import {
  requestBaiduTextTranslate,
  requestCaiyunTextTranslate,
  requestDeepLTextTranslate,
  requestTencentTextTranslate,
  requestYoudaoDictionary,
} from "./request";
import { appleTranslate } from "./scripts";
import {
  LanguageItem,
  QueryWordInfo,
  RequestErrorInfo,
  RequestTypeResult,
  TranslateDisplayResult,
  TranslateFormatResult,
  TranslationType,
  YoudaoTranslateResult,
} from "./types";
import {
  checkIfInstalledEudic,
  checkIfShowMultipleTranslations,
  defaultLanguage1,
  defaultLanguage2,
  getAutoSelectedTargetLanguageId,
  getLanguageItemFromYoudaoId,
  isTranslateResultTooLong,
  myPreferences,
  trimTextLength,
} from "./utils";

let youdaoTranslateTypeResult: RequestTypeResult | undefined;

/**
 * when has new input text, need to cancel previous request.
 */
let isLastQuery = true;

/**
 * when input text is empty, need to cancel previous request, and clear result.
 */
let shouldCancelQuery = false;

let delayQueryTextTimer: NodeJS.Timeout;
let delayQueryTextInfoTimer: NodeJS.Timeout;

/**
 * Calculate the cost time of each query.
 */
let startTime: number;

export default function () {
  // console.log(`call default function`);
  checkWhetherTwoPreferredLanguagesAreSame();

  /**
   * Delay the time to call the query API. Since API has frequency limit.
   */
  const delayRequestTime = 600;

  const [isLoadingState, setLoadingState] = useState<boolean>(false);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  // Todo: need to optimize, and support Eudic Pro version.
  const [isInstalledEudic, setIsInstalledEudic] = useState<boolean>(false);

  /**
   * use to display input text
   */
  const [inputText, setInputText] = useState<string>();
  /**
   * searchText = inputText.trim(), avoid frequent request API with blank input
   */
  const [searchText, setSearchText] = useState<string>("");

  const [translateDisplayResult, setTranslateDisplayResult] = useState<TranslateDisplayResult[]>();
  /**
     the language type of text, depending on the language type of the current input text.
     */
  const [currentFromLanguageItem, setCurrentFromLanguageItem] = useState<LanguageItem>(defaultLanguage1);
  /*
    default translation language, based on user's preference language, can only defaultLanguage1 or defaultLanguage2 depending on the currentFromLanguageState. cannot be changed manually.
    */
  const [autoSelectedTargetLanguageItem, setAutoSelectedTargetLanguageItem] = useState<LanguageItem>(defaultLanguage1);
  /*
    the user selected translation language, for display, can be changed manually. default userSelectedTargetLanguage is the autoSelectedTargetLanguage.
    */
  const [userSelectedTargetLanguageItem, setUserSelectedTargetLanguageItem] =
    useState<LanguageItem>(autoSelectedTargetLanguageItem);

  useEffect(() => {
    console.log("enter useEffect");

    startTime = Date.now();
    if (searchText) {
      queryText(searchText);
      return;
    }

    if (inputText === undefined) {
      setup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  /**
   * Do something setup when the extension is activated. Only run once.
   */
  function setup() {
    if (myPreferences.enableAutomaticQuerySelectedText) {
      tryQuerySelecedtText();
    }
    checkIfInstalledEudic().then((isInstalled) => {
      setIsInstalledEudic(isInstalled);
    });
  }

  /**
   * Try to detect the selected text, if detect success, then query the selected text.
   */
  function tryQuerySelecedtText() {
    // calculate the selected text cost time
    console.log("try query selected text");
    const startTime = Date.now();
    getSelectedText()
      .then((selectedText) => {
        selectedText = trimTextLength(selectedText);
        new Date().getTime;
        console.log(`getSelectedText: ${selectedText}, cost time: ${Date.now() - startTime} ms`);
        updateInputTextAndQueryTextNow(selectedText, true);
      })
      .catch(() => {
        // do nothing
      });
  }

  /**
   * Query text, automatically detect the language of input text
   */
  function queryText(text: string) {
    console.log("start queryText: " + text);

    setLoadingState(true);
    clearTimeout(delayQueryTextInfoTimer);
    isLastQuery = true;

    detectLanguage(text, (detectedLanguageResult) => {
      console.log(
        `---> final confirmed: ${detectedLanguageResult.confirmed}, type: ${detectedLanguageResult.type}, detectLanguage: ${detectedLanguageResult.youdaoLanguageId}`
      );
      queryTextWithFromLanguageId(detectedLanguageResult.youdaoLanguageId);
    });
  }

  /**
   * query text with from youdao language id
   */
  function queryTextWithFromLanguageId(fromYoudaoLanguageId: string) {
    console.log("queryTextWithFromLanguageId:", fromYoudaoLanguageId);
    setCurrentFromLanguageItem(getLanguageItemFromYoudaoId(fromYoudaoLanguageId));

    // priority to use user selected target language, if conflict, use auto selected target language
    let targetLanguageId = userSelectedTargetLanguageItem.youdaoLanguageId;
    console.log("userSelectedTargetLanguage:", targetLanguageId);
    if (fromYoudaoLanguageId === targetLanguageId) {
      targetLanguageId = getAutoSelectedTargetLanguageId(fromYoudaoLanguageId);
      setAutoSelectedTargetLanguageItem(getLanguageItemFromYoudaoId(targetLanguageId));
      console.log("autoSelectedTargetLanguage: ", targetLanguageId);
    }
    const queryTextInfo: QueryWordInfo = {
      word: searchText,
      fromLanguage: fromYoudaoLanguageId,
      toLanguage: targetLanguageId,
    };
    queryTextWithTextInfo(queryTextInfo);
  }

  /**
   * Query text with text info, query dictionary API or tranalsate API.
   *
   * Todo: need to optimize, change it to class.
   */
  async function queryTextWithTextInfo(queryTextInfo: QueryWordInfo) {
    const { word: queryText, fromLanguage, toLanguage } = queryTextInfo;
    console.log(`---> query text fromTo: ${fromLanguage} -> ${toLanguage}`);
    /**
     * first, request youdao translate API, check if should show multiple translations, if not, then end.
     * if need to show multiple translations, then request other translate API.
     */
    try {
      youdaoTranslateTypeResult = await requestYoudaoDictionary(queryText, fromLanguage, toLanguage);
      if (shouldCancelQuery) {
        updateTranslateDisplayResult(null);
        return;
      }
      if (!isLastQuery) {
        console.log("---> queryTextWithTextInfo: isLastQuery is false, return");
        return;
      }

      const youdaoResult = youdaoTranslateTypeResult.result as YoudaoTranslateResult;
      console.log(`youdao translate result: ${JSON.stringify(youdaoResult, null, 2)}`);
      // From the input text query, to the end of Youdao translation request.
      console.warn(`---> Entire request cost time: ${Date.now() - startTime} ms`);
      const youdaoErrorCode = youdaoResult.errorCode;

      if (youdaoErrorCode === YoudaoRequestStateCode.AccessFrequencyLimited.toString()) {
        console.warn(
          `youdao request frequency limited error: ${youdaoErrorCode}, delay ${delayRequestTime} ms to request again`
        );
        delayQueryWithTextInfo(queryTextInfo);
        return;
      }

      let formatResult = formatYoudaoDictionaryResult(youdaoTranslateTypeResult);
      // if enable automatic play audio and query is word, then download audio and play it
      const enableAutomaticDownloadAudio =
        myPreferences.enableAutomaticPlayWordAudio && formatResult.queryWordInfo.isWord;
      if (enableAutomaticDownloadAudio && isLastQuery) {
        playYoudaoWordAudioAfterDownloading(formatResult.queryWordInfo);
      }

      const [from, to] = youdaoResult.l.split("2"); // from2to
      if (from === to) {
        const targetLanguageId = getAutoSelectedTargetLanguageId(from);
        setAutoSelectedTargetLanguageItem(getLanguageItemFromYoudaoId(targetLanguageId));
        queryTextWithTextInfo(queryTextInfo);
        return;
      }

      setCurrentFromLanguageItem(getLanguageItemFromYoudaoId(from));
      updateTranslateDisplayResult(formatResult);

      // request other translate API to show multiple translations
      if (checkIfShowMultipleTranslations(formatResult)) {
        // check if enable deepl translate
        if (myPreferences.enableDeepLTranslate) {
          console.log("---> deepL translate start");
          requestDeepLTextTranslate(queryText, fromLanguage, toLanguage)
            .then((deepLTypeResult) => {
              // Todo: should use axios.CancelToken to cancel the request!
              if (!shouldCancelQuery) {
                updateFormatTranslateResultWithDeepLResult(formatResult, deepLTypeResult);
                updateTranslateDisplayResult(formatResult);
              }
            })
            .catch((err) => {
              const errorInfo = err as RequestErrorInfo;
              showToast({
                style: Toast.Style.Failure,
                title: `${errorInfo.type} error: ${errorInfo.code}`,
                message: errorInfo.message,
              });
            });
        }

        // check if enable google translate
        if (myPreferences.enableGoogleTranslate) {
          console.log("---> google translate start");
          requestGoogleTranslate(queryText, fromLanguage, toLanguage)
            .then((googleTypeResult) => {
              if (!shouldCancelQuery) {
                updateFormatTranslateResultWithGoogleResult(formatResult, googleTypeResult);
                updateTranslateDisplayResult(formatResult);
              }
            })
            .catch((err) => {
              console.error(`Google error: ${JSON.stringify(err, null, 2)}`);
            });
        }

        // check if enable apple translate
        if (myPreferences.enableAppleTranslate) {
          console.log("apple translate start");
          appleTranslate(queryTextInfo)
            .then((translatedText) => {
              if (translatedText) {
                const appleTranslateResult: RequestTypeResult = {
                  type: TranslationType.Apple,
                  result: translatedText,
                };
                if (!shouldCancelQuery) {
                  updateFormatResultWithAppleTranslateResult(formatResult, appleTranslateResult);
                  updateTranslateDisplayResult(formatResult);
                }
              }
            })
            .catch((error) => {
              const errorInfo = error as RequestErrorInfo;
              console.error(`Apple translate error: ${JSON.stringify(errorInfo, null, 4)}`);
            });
        }

        // check if enable baidu translate
        if (myPreferences.enableBaiduTranslate) {
          console.log("baidu translate start");
          requestBaiduTextTranslate(queryText, fromLanguage, toLanguage)
            .then((baiduTypeResult) => {
              if (!shouldCancelQuery) {
                formatResult = updateFormatResultWithBaiduTranslation(baiduTypeResult, formatResult);
                updateTranslateDisplayResult(formatResult);
              }
            })
            .catch((err) => {
              const errorInfo = err as RequestErrorInfo;
              // * if error is access frequency limited, then delay request again
              if (errorInfo.code === BaiduRequestStateCode.AccessFrequencyLimited.toString()) {
                // Todo: only try request Baidu translate again.
                delayQueryWithTextInfo(queryTextInfo);
                return;
              }
              showToast({
                style: Toast.Style.Failure,
                title: `${errorInfo.type} error: ${errorInfo.code}`,
                message: errorInfo.message,
              });
            });
        }

        // check if enable tencent translate
        if (myPreferences.enableTencentTranslate) {
          console.log(`tencent translate start`);
          requestTencentTextTranslate(queryText, fromLanguage, toLanguage)
            .then((tencentTypeResult) => {
              if (!shouldCancelQuery) {
                formatResult = updateFormatResultWithTencentTranslation(tencentTypeResult, formatResult);
                updateTranslateDisplayResult(formatResult);
              }
            })
            .catch((err) => {
              const errorInfo = err as RequestErrorInfo;
              showToast({
                style: Toast.Style.Failure,
                title: `Tencent translate error`,
                message: errorInfo.message,
              });
            });
        }

        // check if enable caiyun translate
        if (myPreferences.enableCaiyunTranslate) {
          console.log(`caiyun translate start`);
          requestCaiyunTextTranslate(queryText, fromLanguage, toLanguage)
            .then((caiyunTypeResult) => {
              if (!shouldCancelQuery) {
                formatResult = updateFormatResultWithCaiyunTranslation(caiyunTypeResult, formatResult);
                updateTranslateDisplayResult(formatResult);
              }
            })
            .catch((err) => {
              const errorInfo = err as RequestErrorInfo;
              showToast({
                style: Toast.Style.Failure,
                title: `Caiyun translate error`,
                message: errorInfo.message,
              });
            });
        }
      }
    } catch (error) {
      console.error(`---> youdao error: ${JSON.stringify(error)}`);
      youdaoTranslateTypeResult = {
        type: TranslationType.Youdao,
        result: null,
        errorInfo: error as RequestErrorInfo,
      };
      updateTranslateDisplayResult(null);
      return;
    }
  }

  /**
   * update translate display result, loading state, showing detail
   */
  function updateTranslateDisplayResult(formatResult: TranslateFormatResult | null) {
    setLoadingState(false);
    setIsShowingDetail(isTranslateResultTooLong(formatResult));
    setTranslateDisplayResult(formatTranslateDisplayResult(formatResult));
  }

  /**
   * delay query search text, later can cancel the query
   */
  function delayQueryWithTextInfo(queryTextInfo: QueryWordInfo) {
    delayQueryTextInfoTimer = setTimeout(() => {
      queryTextWithTextInfo(queryTextInfo);
    }, delayRequestTime);
  }

  function ListDetail() {
    // console.log("call ListDetail()");
    if (!youdaoTranslateTypeResult) {
      return null;
    }

    const youdaoError = youdaoTranslateTypeResult.errorInfo;
    const isYoudaoRequestError = youdaoError?.code !== YoudaoRequestStateCode.Success.toString();
    if (isYoudaoRequestError) {
      return (
        <List.Item
          title={"Youdao Request Error"}
          subtitle={youdaoError?.message?.length ? `${youdaoError.message}` : ""}
          accessories={[
            {
              text: `Error Code: ${youdaoError?.code}`,
            },
          ]}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="See Error Code Meaning" icon={Icon.Info} url={youdaoErrorCodeUrl} />
              <ActionFeedback />
            </ActionPanel>
          }
        />
      );
    }

    const updateSelectedTargetLanguageItem = (selectedLanguageItem: LanguageItem) => {
      console.log(
        `selected language: ${selectedLanguageItem.youdaoLanguageId}, current target language: ${userSelectedTargetLanguageItem.youdaoLanguageId}`
      );
      // Todo: if selected language is same as current language, then do nothing
      if (selectedLanguageItem.youdaoLanguageId === userSelectedTargetLanguageItem.youdaoLanguageId) {
        return;
      }

      console.log(`updateSelectedTargetLanguageItem: ${selectedLanguageItem.youdaoLanguageId}`);
      setAutoSelectedTargetLanguageItem(selectedLanguageItem);
      setUserSelectedTargetLanguageItem(selectedLanguageItem);
      queryTextWithTextInfo({
        word: searchText,
        fromLanguage: currentFromLanguageItem.youdaoLanguageId,
        toLanguage: selectedLanguageItem.youdaoLanguageId,
      });
    };

    return (
      <Fragment>
        {translateDisplayResult?.map((resultItem, idx) => {
          return (
            <List.Section key={idx} title={resultItem.sectionTitle}>
              {resultItem.items?.map((item) => {
                return (
                  <List.Item
                    key={item.key}
                    icon={{
                      value: getListItemIcon(resultItem.type),
                      tooltip: item.tooltip || "",
                    }}
                    title={item.title}
                    subtitle={item.subtitle}
                    accessories={getWordAccessories(resultItem.type, item)}
                    detail={<List.Item.Detail markdown={item.translationMarkdown} />}
                    actions={
                      <ListActionPanel
                        displayItem={item}
                        isInstalledEudic={isInstalledEudic && myPreferences.enableOpenInEudic}
                        onLanguageUpdate={updateSelectedTargetLanguageItem}
                      />
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
      </Fragment>
    );
  }

  /**
   * check first language and second language is the same
   */
  function checkWhetherTwoPreferredLanguagesAreSame() {
    if (defaultLanguage1.youdaoLanguageId === defaultLanguage2.youdaoLanguageId) {
      return (
        <List>
          <List.Item
            title={"Language Conflict"}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            subtitle={"Your first Language with second Language must be different."}
          />
        </List>
      );
    }
  }

  /**
   * Update input text and search text, then query text according to @isNow
   *
   * @isNow if true, query text right now, false will delay query.
   */
  function updateInputTextAndQueryTextNow(text: string, isNow: boolean) {
    setInputText(text);

    const trimText = trimTextLength(text);
    if (trimText.length === 0) {
      // fix bug: if input text is empty, need to update search text to empty
      shouldCancelQuery = true;
      if (searchText) {
        console.log(`set search text to empty`);
        setSearchText("");
        updateTranslateDisplayResult(null);
      }
      return;
    }

    isLastQuery = false;
    shouldCancelQuery = false;
    clearTimeout(delayQueryTextTimer);

    if (text !== searchText) {
      console.log(`update input text: ${text}, ${text.length}`);
      if (isNow) {
        setSearchText(trimText);
      } else {
        // start delay timer for fetch translate API
        delayQueryTextTimer = setTimeout(() => {
          setSearchText(trimText);
        }, delayRequestTime);
      }
    }
  }

  function onInputChange(text: string) {
    updateInputTextAndQueryTextNow(text, false);
  }

  // console.log(`render interface`);

  return (
    <List
      isLoading={isLoadingState}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={"Search word or translate text..."}
      searchText={inputText}
      onSearchTextChange={onInputChange}
      actions={null}
    >
      <List.EmptyView icon={Icon.BlankDocument} title="Type a word to look up or translate" />
      <ListDetail />
    </List>
  );
}

/**
 * Easter egg: if you use PopClip and have added a shortcut for `Easydict`, such as `Cmd + E`, then you can use PopClip to open Easydict!
 * 
 * Reference: https://github.com/pilotmoon/PopClip-Extensions#extension-snippets-examples
 * 
 * Usage: select following text, then PopClip will show "Install Easydict", click it! 

  # popclip
  name: Easydict
  icon: search E
  key combo: command E

 */
