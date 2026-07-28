/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getSelectedText, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { ListActionPanel } from "@/components/ui/ActionPanel";
import { getListItemIcon } from "@/components/ui/Icons";
import { getWordAccessories } from "@/components/ui/WordAccessories";
import { myPreferences } from "@/consts";
import { config } from "@/core/config";
import type { LanguageItem } from "@/core/language/types";
import { useDebouncedQuery, useInstalledEudic, useQueryEngine, useReleasePrompt } from "@/hooks";
import type { QueryInput } from "@/types/query";
import { logError, logTrace } from "@/utils/logger";

interface SearchWordProps {
  initialQueryText?: string;
  fallbackText?: string;
}

export default function SearchWord({ initialQueryText, fallbackText }: SearchWordProps) {
  const trimQueryText = initialQueryText ? initialQueryText.trim() : fallbackText?.trim();

  const { isShowingReleasePrompt, hideReleasePrompt } = useReleasePrompt();
  const { isInstalledEudic } = useInstalledEudic();

  const {
    displaySections,
    isLoading,
    isShowDetail,
    currentFromLanguageItem,
    autoSelectedTargetLanguageItem,
    queryText,
    queryTextWithTextInfo,
    clearQueryResult,
    setAutoSelectedTargetLanguageItem,
  } = useQueryEngine(config.preferredLanguage1, config.preferredLanguage2);

  const debouncedQuery = useDebouncedQuery(queryText);

  /**
   * Use to display input text.
   */
  const [inputText, setInputText] = useState<string>(trimQueryText || "");
  /**
   * searchText = inputText.trim(), avoid frequent request API with blank input.
   */
  const [searchText, setSearchText] = useState<string>("");

  /**
   * the user selected translation language, used for display, can be changed manually. default userSelectedTargetLanguage is the autoSelectedTargetLanguage.
   */
  const [userSelectedTargetLanguageItem, setUserSelectedTargetLanguageItem] =
    useState<LanguageItem>(autoSelectedTargetLanguageItem);

  const setupCalled = useRef(false);
  useEffect(() => {
    if (!setupCalled.current) {
      setupCalled.current = true;
      setup();
    }
  }, []);

  /**
   * Do something setup when the extension is activated. Only run once.
   */
  function setup() {
    const userInputText = trimQueryText;

    if (userInputText?.length) {
      updateInputTextAndQueryText(userInputText, false);
    } else if (myPreferences.enableAutomaticQuerySelectedText) {
      querySelectedText();
    }
  }

  /**
   * Try to detect the selected text, if detect success, then query the selected text.
   */
  function querySelectedText(): Promise<void> {
    return new Promise((resolve) => {
      getSelectedText()
        .then((selectedText) => {
          selectedText = selectedText.trim();
          logTrace("SearchWord", `selected text: ${selectedText}`);
          updateInputTextAndQueryText(selectedText, false);
          resolve();
        })
        .catch((error) => {
          logError("SearchWord", `getSelectedText error: ${error}`);
          resolve();
        });
    });
  }

  /**
   * User select target language manually.
   *
   */
  const updateSelectedTargetLanguageItem = (selectedLanguageItem: LanguageItem) => {
    if (selectedLanguageItem.youdaoLangCode === userSelectedTargetLanguageItem.youdaoLangCode) {
      return;
    }

    setAutoSelectedTargetLanguageItem(selectedLanguageItem);
    setUserSelectedTargetLanguageItem(selectedLanguageItem);

    const queryWordInfo: QueryInput = {
      word: searchText,
      fromLanguage: currentFromLanguageItem.youdaoLangCode,
      toLanguage: selectedLanguageItem.youdaoLangCode,
    };

    // Clean up previous query results immediately before new query.
    clearQueryResult();
    queryTextWithTextInfo(queryWordInfo);
  };

  /**
   * Update input text and search text, then query text according to @isDelay
   */
  function updateInputTextAndQueryText(text: string, isDelay: boolean) {
    // Normalize newlines to spaces to match Raycast's internal SearchBar behavior.
    const normalizedText = text.replace(/\r?\n/g, " ");

    setInputText(normalizedText);
    const trimText = normalizedText.trim();
    setSearchText(trimText);

    if (trimText.length === 0) {
      debouncedQuery.cancel();
      clearQueryResult();
      return;
    }

    // Only different input text, then clear old results before new input text query.
    if (trimText !== searchText) {
      debouncedQuery.cancel();
      clearQueryResult();
      const toLanguage = userSelectedTargetLanguageItem.youdaoLangCode;
      if (isDelay) {
        debouncedQuery(trimText, toLanguage);
      } else {
        queryText(trimText, toLanguage);
      }
    }
  }

  function onInputChange(text: string) {
    updateInputTextAndQueryText(text, true);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowDetail}
      searchBarPlaceholder={"Search word or translate text..."}
      searchText={inputText}
      onSearchTextChange={onInputChange}
      actions={null}
    >
      {displaySections.map((resultItem, sectionIndex) => {
        const sectionKey = `${resultItem.type}${sectionIndex}`;
        return (
          <List.Section key={sectionKey} title={resultItem.sectionTitle}>
            {resultItem.items?.map((item) => {
              return (
                <List.Item
                  key={item.key}
                  icon={{
                    value: getListItemIcon(item),
                    tooltip: item.tooltip || "",
                  }}
                  title={item.title}
                  subtitle={item.subtitle}
                  accessories={getWordAccessories(item)}
                  detail={<List.Item.Detail markdown={item.detailsMarkdown} />}
                  actions={
                    <ListActionPanel
                      displayItem={item}
                      isShowingReleasePrompt={isShowingReleasePrompt}
                      onHideReleasePrompt={hideReleasePrompt}
                      isInstalledEudic={isInstalledEudic}
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
