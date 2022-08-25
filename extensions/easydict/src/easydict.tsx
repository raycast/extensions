/*
 * @author: tisfeng
 * @createTime: 2022-06-23 14:19
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-20 11:10
 * @fileName: easydict.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { getSelectedText, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { configAxiosProxy } from "./axiosConfig";
import { checkIfPreferredLanguagesConflict, getListItemIcon, getWordAccessories, ListActionPanel } from "./components";
import { DataManager } from "./dataManager/dataManager";
import { QueryWordInfo } from "./dictionary/youdao/types";
import { LanguageItem } from "./language/type";
import { myPreferences, preferredLanguage1 } from "./preferences";
import { DisplaySection } from "./types";
import { checkIfInstalledEudic, checkIfNeedShowReleasePrompt, trimTextLength } from "./utils";

const dataManager = new DataManager();

export default function () {
  const isConflict = checkIfPreferredLanguagesConflict();
  if (isConflict) {
    return isConflict;
  }

  const [isLoadingState, setLoadingState] = useState<boolean>(false);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [isInstalledEudic, setIsInstalledEudic] = useState<boolean>(false);
  const [isShowingReleasePrompt, setIsShowingReleasePrompt] = useState<boolean>(false);

  // check if need show release prompt, every time the list is rendered.
  checkIfNeedShowReleasePrompt((isShowing) => {
    setIsShowingReleasePrompt(isShowing);
  });

  /**
   * use to display input text
   */
  const [inputText, setInputText] = useState<string>();
  /**
   * searchText = inputText.trim(), avoid frequent request API with blank input.
   */
  const [searchText, setSearchText] = useState<string>("");

  const [displayResult, setDisplayResult] = useState<DisplaySection[]>([]);

  /**
   * the language type of text, depending on the language type of the current input text.
   *
   * Todo: directly use language id.
   */
  const [currentFromLanguageItem, setCurrentFromLanguageItem] = useState<LanguageItem>(preferredLanguage1);
  /**
   * default translation language, based on user's preference language, can only defaultLanguage1 or defaultLanguage2 depending on the currentFromLanguageState. cannot be changed manually.
   */
  const [autoSelectedTargetLanguageItem, setAutoSelectedTargetLanguageItem] =
    useState<LanguageItem>(preferredLanguage1);
  /**
   * the user selected translation language, used for display, can be changed manually. default userSelectedTargetLanguage is the autoSelectedTargetLanguage.
   */
  const [userSelectedTargetLanguageItem, setUserSelectedTargetLanguageItem] =
    useState<LanguageItem>(autoSelectedTargetLanguageItem);

  function updateDisplaySections(displayItems: DisplaySection[]) {
    setIsShowingDetail(dataManager.isShowDetail);
    setDisplayResult(displayItems);
  }

  // Todo: need to optimize these callbacks.
  dataManager.updateLoadingState = setLoadingState;
  dataManager.updateListDisplaySections = updateDisplaySections;
  dataManager.updateCurrentFromLanguageItem = setCurrentFromLanguageItem;
  dataManager.updateAutoSelectedTargetLanguageItem = setAutoSelectedTargetLanguageItem;

  useEffect(() => {
    if (inputText === undefined) {
      setup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText]);

  /**
   * Do something setup when the extension is activated. Only run once.
   */
  function setup() {
    if (myPreferences.enableAutomaticQuerySelectedText) {
      tryQuerySelecedtText();
    }

    configAxiosProxy();

    checkIfInstalledEudic().then((isInstalled) => {
      setIsInstalledEudic(isInstalled);
    });
  }

  /**
   * Try to detect the selected text, if detect success, then query the selected text.
   */
  function tryQuerySelecedtText() {
    getSelectedText()
      .then((selectedText) => {
        selectedText = trimTextLength(selectedText);
        console.log(`getSelectedText: ${selectedText}`); // cost about 20 ms
        updateInputTextAndQueryText(selectedText, false);
      })
      .catch((e) => e);
  }

  /**
   * User select target language manually.
   *
   * Todo: move it to dataManager.
   */
  const updateSelectedTargetLanguageItem = (selectedLanguageItem: LanguageItem) => {
    console.log(
      `selected language: ${selectedLanguageItem.youdaoId}, current target language: ${userSelectedTargetLanguageItem.youdaoId}`
    );
    if (selectedLanguageItem.youdaoId === userSelectedTargetLanguageItem.youdaoId) {
      return;
    }

    console.log(`updateSelectedTargetLanguageItem: ${selectedLanguageItem.youdaoId}`);
    setAutoSelectedTargetLanguageItem(selectedLanguageItem);
    setUserSelectedTargetLanguageItem(selectedLanguageItem);

    const queryWordInfo: QueryWordInfo = {
      word: searchText,
      fromLanguage: currentFromLanguageItem.youdaoId,
      toLanguage: selectedLanguageItem.youdaoId,
    };

    // Clean up previous query results immediately before new query.
    dataManager.clearQueryResult();
    dataManager.queryTextWithTextInfo(queryWordInfo);
  };

  /**
   * Update input text and search text, then query text according to @isDelay
   */
  function updateInputTextAndQueryText(text: string, isDelay: boolean) {
    console.log(`update input text: ${text}, length: ${text.length}`);

    setInputText(text);
    const trimText = trimTextLength(text);
    setSearchText(trimText);

    // If trimText is empty, then do not query.
    if (trimText.length === 0) {
      console.log("trimText is empty, do not query");
      dataManager.clearQueryResult();
      return;
    }

    // Only different input text, then clear old results before new input text query.
    if (trimText !== searchText) {
      dataManager.clearQueryResult();
      const toLanguage = userSelectedTargetLanguageItem.youdaoId;
      dataManager.delayQueryText(trimText, toLanguage, isDelay);
    }
  }

  function onInputChange(text: string) {
    updateInputTextAndQueryText(text, true);
  }

  return (
    <List
      isLoading={isLoadingState}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={"Search word or translate text..."}
      searchText={inputText}
      onSearchTextChange={onInputChange}
      actions={null}
    >
      {displayResult.map((resultItem, idx) => {
        const sectionKey = `${resultItem.type}${idx}`;
        return (
          <List.Section key={sectionKey} title={resultItem.sectionTitle}>
            {resultItem.items?.map((item) => {
              return (
                <List.Item
                  key={item.key}
                  icon={{
                    value: getListItemIcon(item.displayType),
                    tooltip: item.tooltip || "",
                  }}
                  title={item.title}
                  subtitle={item.subtitle}
                  accessories={getWordAccessories(item)}
                  detail={<List.Item.Detail markdown={item.translationMarkdown} />}
                  actions={
                    <ListActionPanel
                      displayItem={item}
                      isShowingReleasePrompt={isShowingReleasePrompt}
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
      <List.EmptyView icon={Icon.BlankDocument} title="Type a word to look up or translate" />
    </List>
  );
}

/**
 * Easter egg: if you use PopClip and have added a shortcut for `Easydict`, such as `Cmd + E`, then you can use PopClip to quickly open Easydict!
 * 
 * Reference: https://github.com/pilotmoon/PopClip-Extensions#extension-snippets-examples
 * 
 * Usage: select following text, then PopClip will show "Install Easydict", click it! 

  # popclip
  name: Easydict
  icon: search E
  key combo: command E

 */
