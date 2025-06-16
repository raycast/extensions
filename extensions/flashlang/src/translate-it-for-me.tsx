// src/translation-history.tsx
import { useCallback, useEffect, useState, useMemo } from "react";
import { List, Action, ActionPanel, Icon, AI, getPreferenceValues } from "@raycast/api";
import { readContent } from "./utils";
import { useAI } from "@raycast/utils";
import { translateVocabularyPrompt } from "./utils/prompts";
import useLanguageList from "./utils/useLanguageList";
import { getSearchHistory, upsertSearchHistory, removeFromSearchHistory } from "./utils/searchHistory";
import { addToFlashcards, removeFromFlashcards, getFlashcards, FlashcardRecord } from "./utils/flashcards";
import FuzzySearch from "fuzzy-search";

interface TranslationRecord {
  vocabulary: string;
  translation: string;
}

interface SearchEntry {
  word: string;
  translation: string;
}

export default function TranslateItForMe() {
  const languageOptions = useLanguageList();
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [history, setHistory] = useState<Record<string, string>>({});

  const [promptString, setPromptString] = useState("");
  const [flashcards, setFlashcards] = useState<FlashcardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Add this state to track current translation
  const [currentTranslatingWord, setCurrentTranslatingWord] = useState<string>("");

  useEffect(() => {
    const readSelectedText = async () => {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const preferredSource = preferences.source;

        const selectedText = await readContent(preferredSource);
        const existingHistory = await getSearchHistory();
        setHistory({
          ...existingHistory,
          [selectedText]: existingHistory[selectedText] ?? "",
        });
        setSearchText(selectedText);
      } catch (error) {
        console.error("Failed to read selected text:", error);
      }
    };
    readSelectedText();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const existingHistory = await getSearchHistory();
        setHistory(existingHistory);
      } catch (error) {
        console.error("Failed to load history:", error);
      }
      setIsLoadingHistory(false);
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getSearchHistory();
        setHistory(history);
      } catch (error) {
        console.error("Failed to fetch translation history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchFlashcards = async () => {
      try {
        const cards = await getFlashcards();
        setFlashcards(cards);
      } catch (error) {
        console.error("Failed to fetch flashcards:", error);
      }
    };

    fetchHistory();
    fetchFlashcards();
  }, []);

  const generatePromptByText = useCallback(
    async (vocabulary: string = "") => {
      const promptString = await translateVocabularyPrompt(vocabulary || searchText, languageOptions);
      setPromptString(promptString || "");
      setSearchText(vocabulary);
      setCurrentTranslatingWord(vocabulary || searchText); // Track what we're translating
    },
    [searchText, languageOptions],
  );

  // Get AI translation if no history exists
  const {
    data: aiTranslation,
    isLoading: isAiLoading,
    revalidate,
  } = useAI(promptString || "", {
    model: AI.Model["OpenAI_GPT4o-mini"],
    creativity: 0,
    execute: !!promptString,
  });

  const handleRefreshTranslation = useCallback(
    async (vocabulary: string) => {
      await upsertSearchHistory(vocabulary, "");
      const updatedHistory = await getSearchHistory();
      setHistory(updatedHistory);
      generatePromptByText(vocabulary);
      revalidate();
    },
    [languageOptions, searchText],
  );

  const generatePromptBySearchText = useCallback(async () => {
    handleRefreshTranslation(searchText);
  }, [searchText, languageOptions]);

  // Modify the save effect to use currentTranslatingWord
  useEffect(() => {
    if (currentTranslatingWord && aiTranslation) {
      setHistory((prevHistory) => ({ ...prevHistory, [currentTranslatingWord]: aiTranslation }));
      if (!isAiLoading && aiTranslation) {
        upsertSearchHistory(currentTranslatingWord, aiTranslation);
        setCurrentTranslatingWord("");
      }
    }
  }, [aiTranslation, currentTranslatingWord, isAiLoading]);

  const handleRemoveFromHistory = useCallback(
    async (vocabulary: string) => {
      try {
        if (searchText === vocabulary) {
          setSearchText("");
          setSelectedItemId("");
        }

        await removeFromSearchHistory(vocabulary);
        const updatedHistory = await getSearchHistory();
        setHistory(updatedHistory);
      } catch (error) {
        console.error("Failed to remove from history:", error);
      }
    },
    [searchText],
  );

  const historyEntries = useMemo<[string, string][]>(() => {
    const entries = Object.entries(history).map(([word, translation]) => ({
      word,
      translation,
    }));

    if (!searchText) return entries.map(({ word, translation }) => [word, translation]);

    // Create a new entry if searchText doesn't exist in history
    const hasExactMatch = entries.some((entry) => entry.word === searchText);
    if (!hasExactMatch && searchText.trim()) {
      entries.unshift({ word: searchText, translation: "" });
    }

    const searcher = new FuzzySearch(entries, ["word"], {
      caseSensitive: false,
      sort: true,
    });

    return searcher.search(searchText).map(({ word, translation }: SearchEntry) => [word, translation]);
  }, [history, searchText]);

  const handleAddToFlashcard = useCallback(
    async (vocabulary: string) => {
      try {
        const translation = history[vocabulary];
        if (translation) {
          const updatedFlashcards = await addToFlashcards(vocabulary, translation);
          setFlashcards(updatedFlashcards);
        }
      } catch (error) {
        console.error("Failed to save flashcards:", error);
      }
    },
    [history],
  );

  const handleRemoveFromFlashcards = async (vocabulary: string) => {
    try {
      const updatedFlashcards = await removeFromFlashcards(vocabulary);
      setFlashcards(updatedFlashcards);
    } catch (error) {
      console.error("Failed to remove from flashcards:", error);
    }
  };

  const renderTranslationItem = useCallback(
    (item: TranslationRecord, index: number) => {
      const isInFlashcards = flashcards?.some((card) => card.vocabulary === item.vocabulary);

      return (
        <List.Item
          key={item.vocabulary + index}
          id={item.vocabulary}
          title={item.vocabulary}
          accessories={[
            ...(isInFlashcards ? [{ icon: Icon.Star, tooltip: "Added to Flashcards" }] : []),
            {
              text: new Date().toLocaleDateString(),
            },
          ].filter(Boolean)}
          actions={
            <ActionPanel>
              <Action
                title="Translate / Refresh"
                onAction={() => handleRefreshTranslation(item.vocabulary)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              {isInFlashcards ? (
                <Action
                  title="Remove from Flashcards"
                  onAction={() => handleRemoveFromFlashcards(item.vocabulary)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  style={Action.Style.Regular}
                />
              ) : (
                <Action
                  title="Add Selected to Flashcards"
                  onAction={() => handleAddToFlashcard(item.vocabulary)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
              )}
              <Action
                title="Remove from History"
                onAction={() => handleRemoveFromHistory(item.vocabulary)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`> ${item.vocabulary}\n\n${history[item.vocabulary] || "*Press Enter to translate*"}`}
            />
          }
        />
      );
    },
    [flashcards, handleAddToFlashcard, handleRefreshTranslation, handleRemoveFromFlashcards, handleRemoveFromHistory],
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoadingHistory || isAiLoading || isLoading}
      searchBarPlaceholder="Search or type new word to translate..."
      onSearchTextChange={(text) => {
        setSearchText(text);

        // Auto-select the matching entry
        if (text) {
          const exactMatch = Object.keys(history).find((word) => word === text);
          setSelectedItemId(exactMatch || text);
        } else {
          setSelectedItemId("");
        }
      }}
      searchText={searchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(itemId) => {
        if (!isAiLoading) {
          setSelectedItemId(itemId || "");
        }
      }}
      filtering
      throttle
      actions={
        <ActionPanel>
          <Action title="Translate" onAction={generatePromptBySearchText} />
        </ActionPanel>
      }
    >
      {historyEntries.map(([word, translation], index) =>
        renderTranslationItem({ vocabulary: word, translation }, index),
      )}
    </List>
  );
}
