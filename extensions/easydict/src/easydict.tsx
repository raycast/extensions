/*
 * @author: tisfeng
 * @createTime: 2022-06-23 14:19
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-03 22:23
 * @fileName: easydict.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Fragment, useEffect, useState } from "react";
import ListActionPanel, {
  ActionCurrentVersion,
  ActionFeedback,
  ActionRecentUpdate,
  getListItemIcon,
  getWordAccessories,
} from "./components";
import { Action, ActionPanel, Color, getSelectedText, Icon, List, showToast, Toast } from "@raycast/api";
import {
  LanguageItem,
  TranslateDisplayResult,
  TranslateTypeResult,
  YoudaoTranslateResult,
  TranslateFormatResult,
  QueryWordInfo,
  RequestErrorInfo,
} from "./types";
import {
  BaiduRequestStateCode,
  getYoudaoErrorInfo,
  TranslateType,
  youdaoErrorCodeUrl,
  YoudaoRequestStateCode,
} from "./consts";
import {
  defaultLanguage1,
  defaultLanguage2,
  getAutoSelectedTargetLanguageId,
  myPreferences,
  isTranslateResultTooLong,
  isShowMultipleTranslations,
  getLanguageItemFromYoudaoId,
  trimTextLength,
} from "./utils";
import {
  requestBaiduTextTranslate,
  requestCaiyunTextTranslate,
  requestTencentTextTranslate,
  requestYoudaoDictionary,
} from "./request";
import {
  formatTranslateDisplayResult,
  formatYoudaoDictionaryResult,
  updateFormateResultWithBaiduTranslation,
  updateFormateResultWithCaiyunTranslation,
  updateFormateResultWithTencentTranslation,
  updateFormatResultWithAppleTranslateResult,
} from "./formatData";
import { detectLanguage } from "./detectLanguage";
import { appleTranslate } from "./scripts";
import { playYoudaoWordAudioAfterDownloading } from "./dict/youdao/request";

let youdaoTranslateTypeResult: TranslateTypeResult | undefined;

/**
 * when has new input text, need to cancel previous request
 */
let isLastQuery = true;

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

  /**
   * use to display input text
   */
  const [inputText, setInputText] = useState<string>("");
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
    if (searchText.length > 0) {
      queryText(searchText);
      return;
    }

    // try to query selected text when the extension is activated.
    if (myPreferences.isAutomaticQuerySelectedText) {
      tryQuerySelecedtText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

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
    console.log("start queryText");

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
  function queryTextWithFromLanguageId(youdaoLanguageId: string) {
    console.log("queryTextWithFromLanguageId:", youdaoLanguageId);
    setCurrentFromLanguageItem(getLanguageItemFromYoudaoId(youdaoLanguageId));

    // priority to use user selected target language, if conflict, use auto selected target language
    let targetLanguageId = userSelectedTargetLanguageItem.youdaoLanguageId;
    console.log("userSelectedTargetLanguage:", targetLanguageId);
    if (youdaoLanguageId === targetLanguageId) {
      targetLanguageId = getAutoSelectedTargetLanguageId(youdaoLanguageId);
      setAutoSelectedTargetLanguageItem(getLanguageItemFromYoudaoId(targetLanguageId));
      console.log("autoSelectedTargetLanguage: ", targetLanguageId);
    }
    const queryTextInfo: QueryWordInfo = {
      word: searchText,
      fromLanguage: youdaoLanguageId,
      toLanguage: targetLanguageId,
      isWord: false,
    };
    queryTextWithTextInfo(queryTextInfo);
  }

  async function queryTextWithTextInfo(queryTextInfo: QueryWordInfo) {
    const [queryText, fromLanguage, toLanguage] = [
      queryTextInfo.word,
      queryTextInfo.fromLanguage,
      queryTextInfo.toLanguage,
    ];
    console.log(`---> query text fromTo: ${fromLanguage} -> ${toLanguage}`);
    /**
     * first, request youdao translate API, check if should show multiple translations, if not, then end.
     * if need to show multiple translations, then request other translate API.
     */
    try {
      youdaoTranslateTypeResult = await requestYoudaoDictionary(queryText, fromLanguage, toLanguage);
      const youdaoResult = youdaoTranslateTypeResult.result as YoudaoTranslateResult;
      console.log(`youdao translate result: ${JSON.stringify(youdaoResult, null, 2)}`);
      console.warn(`query cost time: ${Date.now() - startTime} ms`);
      const youdaoErrorCode = youdaoResult.errorCode;
      youdaoTranslateTypeResult.errorInfo = getYoudaoErrorInfo(youdaoErrorCode);

      if (youdaoErrorCode === YoudaoRequestStateCode.AccessFrequencyLimited.toString()) {
        console.warn(
          `youdao request frequency limited error: ${youdaoErrorCode}, delay ${delayRequestTime} ms to request again`
        );
        delayQueryWithTextInfo(queryTextInfo);
        return;
      } else if (youdaoErrorCode !== YoudaoRequestStateCode.Success.toString()) {
        console.error(`youdao error: ${JSON.stringify(youdaoTranslateTypeResult.errorInfo)}`);
        updateTranslateDisplayResult(null);
        return;
      }

      let formatResult = formatYoudaoDictionaryResult(youdaoTranslateTypeResult);
      // if enable automatic play audio and query is word, then download audio and play it
      const enableAutomaticDownloadAudio = myPreferences.isAutomaticPlayWordAudio && formatResult.queryWordInfo.isWord;
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
      if (isShowMultipleTranslations(formatResult)) {
        // check if enable apple translate
        if (myPreferences.enableAppleTranslate) {
          console.log("apple translate start");
          appleTranslate(queryTextInfo)
            .then((translatedText) => {
              if (translatedText) {
                const appleTranslateResult: TranslateTypeResult = {
                  type: TranslateType.Apple,
                  result: { translatedText },
                };
                updateFormatResultWithAppleTranslateResult(formatResult, appleTranslateResult);
                updateTranslateDisplayResult(formatResult);
              }
            })
            .catch((error) => {
              console.warn(`apple translate error: ${error}`);
            });
        }

        // check if enable baidu translate
        if (myPreferences.enableBaiduTranslate) {
          console.log("baidu translate start");
          requestBaiduTextTranslate(queryText, fromLanguage, toLanguage)
            .then((baiduRes) => {
              formatResult = updateFormateResultWithBaiduTranslation(baiduRes, formatResult);
              updateTranslateDisplayResult(formatResult);
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
                title: `${errorInfo.type}: ${errorInfo.code}`,
                message: errorInfo.message,
              });
            });
        }

        // check if enable tencent translate
        if (myPreferences.enableTencentTranslate) {
          console.log(`tencent translate start`);
          requestTencentTextTranslate(queryText, fromLanguage, toLanguage)
            .then((tencentRes) => {
              formatResult = updateFormateResultWithTencentTranslation(tencentRes, formatResult);
              updateTranslateDisplayResult(formatResult);
            })
            .catch((err) => {
              const errorInfo = err as RequestErrorInfo;
              showToast({
                style: Toast.Style.Failure,
                title: `tencent translate error`,
                message: errorInfo.message,
              });
            });
        }

        // check if enable caiyun translate
        if (myPreferences.enableCaiyunTranslate) {
          console.log(`caiyun translate start`);
          requestCaiyunTextTranslate(queryText, fromLanguage, toLanguage)
            .then((caiyunRes) => {
              formatResult = updateFormateResultWithCaiyunTranslation(caiyunRes, formatResult);
              updateTranslateDisplayResult(formatResult);
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
      console.warn(`requestYoudaoDictionary error: ${error}`);
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
    if (!youdaoTranslateTypeResult) {
      return null;
    }

    const youdaoErrorCode = (youdaoTranslateTypeResult.result as YoudaoTranslateResult).errorCode;
    const youdaoErrorMessage = youdaoTranslateTypeResult?.errorInfo?.message;
    const isYoudaoRequestError = youdaoErrorCode !== YoudaoRequestStateCode.Success.toString();

    if (isYoudaoRequestError) {
      return (
        <List.Item
          title={"Youdao Request Error"}
          subtitle={youdaoErrorMessage?.length ? `${youdaoErrorMessage}` : ""}
          accessories={[
            {
              text: `Error Code: ${youdaoErrorCode}`,
            },
          ]}
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="See Error Code Meaning" icon={Icon.QuestionMark} url={youdaoErrorCodeUrl} />
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
                    actions={<ListActionPanel displayItem={item} onLanguageUpdate={updateSelectedTargetLanguageItem} />}
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
            icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
            subtitle={"Your first Language with second Language must be different."}
          />
        </List>
      );
    }
  }

  /**
   * Update input text and search text, then query text according to @isNow
   *
   * @isNow if true, query text right now, fase will delay query.
   */
  function updateInputTextAndQueryTextNow(text: string, isNow: boolean) {
    setInputText(text);

    const trimText = trimTextLength(text);
    console.log(`update input text: ${text}`);
    if (trimText.length === 0) {
      updateTranslateDisplayResult(null);
      return;
    }

    isLastQuery = false;
    clearTimeout(delayQueryTextTimer);

    if (trimText !== searchText) {
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

  function onInputChangeEvent(text: string) {
    updateInputTextAndQueryTextNow(text, false);
  }

  return (
    <List
      isLoading={isLoadingState}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={"Search word or translate text..."}
      searchText={inputText}
      onSearchTextChange={onInputChangeEvent}
      actions={
        <ActionPanel>
          <ActionFeedback />
          <ActionRecentUpdate />
          <ActionCurrentVersion />
        </ActionPanel>
      }
    >
      <List.EmptyView icon={Icon.TextDocument} title="Type a word to look up or translate" />
      <ListDetail />
    </List>
  );
}
