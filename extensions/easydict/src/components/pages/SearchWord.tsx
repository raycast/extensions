/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getSelectedText, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fallbackAIProviderToPromptJSON } from "@/ai-providers/repository";
import type { OpenAICompatibleProfile } from "@/ai-providers/types";
import { ListActionPanel } from "@/components/ui/ActionPanel";
import { getListItemIcon } from "@/components/ui/Icons";
import { getWordAccessories } from "@/components/ui/WordAccessories";
import { myPreferences } from "@/consts";
import { config } from "@/core/config";
import type { LanguageItem } from "@/core/language/types";
import { getDisplaySectionIds, getListItemId } from "@/core/query/displayIdentities";
import {
  useAIProviderProfiles,
  useDebouncedQuery,
  useFavoriteWords,
  useInstalledEudic,
  useQueryEngine,
  useReleasePrompt,
} from "@/hooks";
import {
  builtinDictionaryProviderServices,
  builtinTranslationServices,
  builtinTranslationServicesBeforeAIProfilesLoad,
  resolveProviderServices,
} from "@/providers/registry";
import { buildFavoriteWord } from "@/types/favorite";
import type { QueryInput, QueryWordInfo } from "@/types/query";
import { logError, logTrace } from "@/utils/logger";

import { useFirstItemAnchor } from "./useFirstItemAnchor";

interface SearchWordProps {
  initialQueryText?: string;
  fallbackText?: string;
}

export default function SearchWord({ initialQueryText, fallbackText }: SearchWordProps) {
  const trimQueryText = initialQueryText ? initialQueryText.trim() : fallbackText?.trim();

  const { isShowingReleasePrompt, hideReleasePrompt } = useReleasePrompt();
  const { isInstalledEudic } = useInstalledEudic();
  const { has, toggle } = useFavoriteWords();
  const aiProviderProfiles = useAIProviderProfiles();
  const handleNativeJSONUnsupported = useCallback(
    async (fallbackProfile: OpenAICompatibleProfile) => {
      try {
        const saved = await fallbackAIProviderToPromptJSON(fallbackProfile.id);
        if (saved) await aiProviderProfiles.revalidate();
        await showToast({
          style: Toast.Style.Success,
          title: "Native JSON is unsupported",
          message: saved
            ? `${fallbackProfile.name} was switched to Prompt-Based JSON.`
            : `${fallbackProfile.name} used Prompt-Based JSON for this request. Update the saved provider manually.`,
        });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Native JSON is unsupported",
          message: `${fallbackProfile.name} used Prompt-Based JSON for this request, but its saved setting could not be updated.`,
        });
      }
    },
    [aiProviderProfiles.revalidate],
  );
  const resolvedServiceSnapshot = useMemo(() => {
    if (aiProviderProfiles.storedState) {
      return resolveProviderServices(aiProviderProfiles.storedState, handleNativeJSONUnsupported);
    }
    return {
      translationServices:
        aiProviderProfiles.state.kind === "loading"
          ? builtinTranslationServicesBeforeAIProfilesLoad
          : builtinTranslationServices,
      dictionaryServices: builtinDictionaryProviderServices,
    };
  }, [aiProviderProfiles.profiles, aiProviderProfiles.state.kind, handleNativeJSONUnsupported]);

  const {
    displaySections,
    queryGeneration,
    listEpoch,
    isLoading,
    isShowDetail,
    currentFromLanguageItem,
    autoSelectedTargetLanguageItem,
    queryText,
    queryTextWithTextInfo,
    clearQueryResult,
    setAutoSelectedTargetLanguageItem,
  } = useQueryEngine(config.preferredLanguage1, config.preferredLanguage2, resolvedServiceSnapshot);
  const displaySectionIds = useMemo(
    () => getDisplaySectionIds(displaySections, queryGeneration),
    [displaySections, queryGeneration],
  );
  const itemIds = useMemo(
    () =>
      displaySections.flatMap((section, sectionIndex) =>
        section.items.map((_, itemIndex) => getListItemId(displaySectionIds[sectionIndex], itemIndex)),
      ),
    [displaySectionIds, displaySections],
  );
  const listIsLoading = isLoading || aiProviderProfiles.isLoading;
  const { selectedItemId, onSelectionChange } = useFirstItemAnchor(itemIds, queryGeneration);

  const debouncedQuery = useDebouncedQuery(queryText);

  // Favorites are per-query (one word), not per-item: queryWordInfo is identical
  // across every section/item of a single lookup, so the first item is representative.
  const queryWordInfo: QueryWordInfo | undefined = displaySections[0]?.items[0]?.queryWordInfo;
  const isFavorite = !!queryWordInfo && has(queryWordInfo);
  // Snapshot only complete results: toggling mid-load would store an incomplete
  // (translation-less, partial dictionary) snapshot that can't be refreshed offline.
  const onToggleFavorite = async () => {
    if (!queryWordInfo) return;

    if (listIsLoading && !isFavorite) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error adding favorite",
        message: "Add this word to favorites after all results load.",
      });
      return;
    }

    await toggle(buildFavoriteWord(queryWordInfo, displaySections));
    if (!isFavorite) {
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
        message: queryWordInfo.word,
      });
    }
  };

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
  const shownProfileLoadErrorRef = useRef<string | undefined>(undefined);
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

  const profileLoadError =
    aiProviderProfiles.state.kind === "invalid"
      ? aiProviderProfiles.state.message
      : aiProviderProfiles.state.kind === "unsupported"
        ? `Unsupported AI provider configuration version: ${String(aiProviderProfiles.state.version)}`
        : aiProviderProfiles.state.kind === "error"
          ? aiProviderProfiles.state.error.message
          : undefined;

  useEffect(() => {
    if (!profileLoadError) {
      shownProfileLoadErrorRef.current = undefined;
      return;
    }
    if (shownProfileLoadErrorRef.current === profileLoadError) return;

    shownProfileLoadErrorRef.current = profileLoadError;
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load AI Provider Configuration",
      message: profileLoadError,
    });
  }, [profileLoadError]);

  return (
    <List
      key={listEpoch}
      isLoading={listIsLoading}
      isShowingDetail={isShowDetail}
      searchBarPlaceholder={"Search word or translate text..."}
      searchText={inputText}
      onSearchTextChange={onInputChange}
      selectedItemId={selectedItemId}
      onSelectionChange={onSelectionChange}
      actions={null}
    >
      {displaySections.map((resultItem, sectionIndex) => {
        const sectionId = displaySectionIds[sectionIndex];
        return (
          <List.Section key={sectionId} title={resultItem.sectionTitle}>
            {resultItem.items?.map((item, itemIndex) => {
              const itemId = getListItemId(sectionId, itemIndex);
              return (
                <List.Item
                  key={itemId}
                  id={itemId}
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
                      isFavorite={isFavorite}
                      onToggleFavorite={onToggleFavorite}
                      onLanguageUpdate={updateSelectedTargetLanguageItem}
                    />
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
      <List.EmptyView
        icon={profileLoadError ? Icon.Warning : Icon.BlankDocument}
        title={profileLoadError ? "AI Provider Configuration Error" : "Type a word to look up or translate"}
        description={profileLoadError}
      />
    </List>
  );
}
