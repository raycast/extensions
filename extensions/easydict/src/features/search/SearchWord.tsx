/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getSelectedText, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { myPreferences } from "@/consts";
import { config } from "@/core/config";
import { renderSelectedRow } from "@/core/content/render";
import type { LanguageItem } from "@/core/language/types";
import { getDisplaySectionIds, getListItemId } from "@/core/query/displayIdentities";
import { getListItemIcon } from "@/core/results/icons";
import type { QueryInput, QueryWordInfo } from "@/core/results/types";
import { addFavoritesToAnkiWithToast } from "@/features/favorites/ankiToast";
import { buildFavoriteWord } from "@/features/favorites/model";
import { useFavoriteWords } from "@/features/favorites/useFavoriteWords";
import type { OpenAICompatibleProfile } from "@/providers/profiles/types";
import { useAIProviderProfiles } from "@/providers/profiles/useAIProviderProfiles";
import {
  builtinDictionaryProviderServices,
  builtinTranslationServices,
  resolveProviderServices,
} from "@/providers/registry";
import { logError, logTrace } from "@/shared/logger";

import { ListActionPanel } from "./ActionPanel";
import { handleNativeJSONFallback } from "./nativeJSONFallback";
import { useDebouncedQuery } from "./useDebouncedQuery";
import { useFirstItemAnchor } from "./useFirstItemAnchor";
import { useInstalledEudic } from "./useInstalledEudic";
import { useQueryEngine } from "./useQueryEngine";
import { useReleasePrompt } from "./useReleasePrompt";
import { getWordAccessories } from "./WordAccessories";

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
    (fallbackProfile: Pick<OpenAICompatibleProfile, "id" | "name">, signal?: AbortSignal) =>
      handleNativeJSONFallback(fallbackProfile, aiProviderProfiles.revalidate, signal),
    [aiProviderProfiles.revalidate],
  );
  const resolvedServiceSnapshot = useMemo(() => {
    if (aiProviderProfiles.storedState) {
      return resolveProviderServices(aiProviderProfiles.storedState, handleNativeJSONUnsupported);
    }
    return {
      translationServices: builtinTranslationServices,
      dictionaryServices: builtinDictionaryProviderServices,
    };
  }, [aiProviderProfiles.storedState, handleNativeJSONUnsupported]);

  const {
    viewSections,
    composedContent,
    queryGeneration,
    listEpoch,
    isLoading,
    isShowDetail,
    currentFromLanguageItem,
    queryText,
    queryTextWithTextInfo,
    regenerateService,
    clearQueryResult,
  } = useQueryEngine(config.preferredLanguage1, resolvedServiceSnapshot);
  const displaySectionIds = useMemo(
    () => getDisplaySectionIds(viewSections, queryGeneration),
    [viewSections, queryGeneration],
  );
  const itemIds = useMemo(
    () =>
      viewSections.flatMap((section, sectionIndex) =>
        section.items.map((_, itemIndex) => getListItemId(displaySectionIds[sectionIndex], itemIndex)),
      ),
    [displaySectionIds, viewSections],
  );
  const listIsLoading = isLoading || aiProviderProfiles.isLoading;
  const { selectedItemId, onSelectionChange } = useFirstItemAnchor(itemIds, queryGeneration);

  const debouncedQuery = useDebouncedQuery(queryText);

  const selectedMarkdown = useMemo(() => {
    if (!isShowDetail || !selectedItemId) return undefined;
    for (const [sectionIndex, section] of viewSections.entries()) {
      const itemIndex = section.items.findIndex(
        (_, index) => getListItemId(displaySectionIds[sectionIndex], index) === selectedItemId,
      );
      if (itemIndex >= 0) return renderSelectedRow(section.items[itemIndex], viewSections);
    }
    return undefined;
  }, [isShowDetail, selectedItemId, viewSections, displaySectionIds]);

  // The first row supplies the favorite identity; each service retains its own language direction.
  const queryWordInfo: QueryWordInfo | undefined = viewSections[0]?.items[0]?.service.query;
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

    try {
      const favorite = buildFavoriteWord(queryWordInfo, composedContent.services);
      await toggle(favorite);
      if (isFavorite) return;

      // Removing a favorite never deletes its Anki card, which may already carry review history.
      if (myPreferences.enableAutomaticAddFavoriteToAnki) {
        await addFavoritesToAnkiWithToast([favorite], { justFavorited: true });
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
        message: queryWordInfo.word,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Update Favorites" });
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
   * The user's target language starts with their second preferred language and can be changed manually.
   */
  const [userSelectedTargetLanguageItem, setUserSelectedTargetLanguageItem] = useState<LanguageItem>(
    config.preferredLanguage2,
  );

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
      {viewSections.map((resultItem, sectionIndex) => {
        const sectionId = displaySectionIds[sectionIndex];
        return (
          <List.Section key={sectionId} title={resultItem.title}>
            {resultItem.items.map((item, itemIndex) => {
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
                  detail={<List.Item.Detail markdown={itemId === selectedItemId ? selectedMarkdown : undefined} />}
                  actions={
                    <ListActionPanel
                      displayItem={item}
                      isShowingReleasePrompt={isShowingReleasePrompt}
                      onHideReleasePrompt={hideReleasePrompt}
                      isInstalledEudic={isInstalledEudic}
                      isFavorite={isFavorite}
                      onToggleFavorite={onToggleFavorite}
                      onLanguageUpdate={updateSelectedTargetLanguageItem}
                      onRequery={() =>
                        queryText(searchText, userSelectedTargetLanguageItem.youdaoLangCode, { bypassCache: true })
                      }
                      onRegenerate={
                        item.service.serviceId.startsWith("profile:")
                          ? () => regenerateService(item.service.serviceId)
                          : undefined
                      }
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
