// src/translation-history.tsx
import { useCallback, useEffect, useState, useMemo } from "react";
import { List, Action, ActionPanel, Icon, AI } from "@raycast/api";
import { getSelection } from "./utils";
import { useAI } from "@raycast/utils";
import { translateVocabularyPrompt } from "./utils/prompts";
import useLanguageList from "./utils/useLanguageList";
import { getSearchHistory, upsertSearchHistory } from "./utils/searchHistory";
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

  useEffect(() => {
    const readSelectedText = async () => {
      try {
        const selectedText = await getSelection();
        const existingHistory = await getSearchHistory();
        setSearchText(selectedText);
        setHistory((prevHistory) => ({ ...prevHistory, [selectedText]: "" }));
        if (selectedText && !existingHistory[selectedText]) {
          onPerformSearch(selectedText);
        }
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

  const onPerformSearch = useCallback(
    async (vocabulary: string = "") => {
      const promptString = await translateVocabularyPrompt(vocabulary || searchText, languageOptions);
      setPromptString(promptString || "");
      setSearchText(vocabulary);
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
      onPerformSearch(vocabulary);
      revalidate();
    },
    [languageOptions, searchText],
  );

  // Save new translation to history
  useEffect(() => {
    if (searchText && aiTranslation) {
      const saveTranslation = async () => {
        await upsertSearchHistory(searchText, aiTranslation);
        const updatedHistory = await getSearchHistory();
        setHistory(updatedHistory);
      };
      saveTranslation();
    }
  }, [aiTranslation, searchText]);

  const historyEntries = useMemo<[string, string][]>(() => {
    const entries = Object.entries(history).map(([word, translation]) => ({
      word,
      translation,
    }));

    if (!searchText) return entries.map(({ word, translation }) => [word, translation]);

    const searcher = new FuzzySearch(entries, ["word"], {
      caseSensitive: false,
      sort: true,
    });

    return searcher.search(searchText).map(({ word, translation }: SearchEntry) => [word, translation]);
  }, [history, searchText]);

  const handleAddToFlashcard = useCallback(
    async (vocabulary: string) => {
      console.log("vocabulary :", vocabulary);
      try {
        const translation = history[vocabulary];
        console.log("translation :", translation);
        if (translation) {
          const updatedFlashcards = await addToFlashcards(vocabulary, translation);
          console.log("updatedFlashcards :", updatedFlashcards);
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
              {isInFlashcards ? (
                <Action
                  title="Remove from Flashcards"
                  onAction={() => handleRemoveFromFlashcards(item.vocabulary)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  style={Action.Style.Regular}
                />
              ) : (
                <Action
                  title="Add Selected to Flashcards"
                  onAction={() => handleAddToFlashcard(item.vocabulary)}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              )}
              <Action
                title="Refresh Translation"
                onAction={() => handleRefreshTranslation(item.vocabulary)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={` ${"> " + item.vocabulary} \n ${item.translation}`} />}
        />
      );
    },
    [flashcards, handleAddToFlashcard, handleRefreshTranslation],
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoadingHistory || isAiLoading || isLoading}
      searchBarPlaceholder="Search or type new word to translate..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(itemId) => setSelectedItemId(itemId || "")}
      throttle
      actions={
        <ActionPanel>
          <Action title="Translate" onAction={onPerformSearch} />
        </ActionPanel>
      }
    >
      {historyEntries.map(([word, translation], index) =>
        renderTranslationItem({ vocabulary: word, translation }, index),
      )}
    </List>
  );
}
