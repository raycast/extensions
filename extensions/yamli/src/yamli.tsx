import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { useFetchTransliteration, TransliterationResult, fetchTransliteration } from "./fetchdata";

// Add a cache for transliteration results keyed by the word.
const transliterationCache = new Map<string, TransliterationResult>();

// Helper function to get the best transliteration for a word
const getFirstTransliteration = (result: TransliterationResult): string => {
  return result.state === "success" && result.options.length > 0 ? result.options[0] : result.originalText;
};

const transliterateWord = async (word: string): Promise<TransliterationResult> => {
  const cached = transliterationCache.get(word);
  if (cached) return cached;

  const result = await fetchTransliteration(word);
  transliterationCache.set(word, result);
  return result;
};

export default function Command() {
  const [text, setText] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const { display_number_shortcuts } = getPreferenceValues();

  type PendingWord = {
    word: string;
    position: number;
  };

  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);

  // Get inline transliterations only for the current (not yet space-terminated) word
  const transliterations = useFetchTransliteration(currentWord);

  // Handle the transliteration results
  const transliterationOptions = transliterations.state === "success" ? transliterations.options : [];

  const replaceWordAtPosition = (text: string, position: number, originalWord: string, replacement: string): string => {
    if (text.substring(position, position + originalWord.length) === originalWord) {
      return text.slice(0, position) + replacement + text.slice(position + originalWord.length);
    }
    return text;
  };

  const handleTextChange = (newText: string) => {
    setText(newText);

    // If this is a paste operation (multiple words)
    if (newText.includes(" ") && newText.split(" ").length > text.split(" ").length + 1) {
      const words = newText.split(" ");
      const results = words.map((word) =>
        transliterateWord(word).catch((error) => ({
          state: "error" as const,
          message: error.message,
          originalText: word,
        })),
      );

      Promise.all(results)
        .then((results) => {
          const transliteratedWords = results.map(getFirstTransliteration);
          setText(transliteratedWords.join(" ") + " ");
          setCurrentWord("");
        })
        .catch(() => {
          setText(newText);
          setCurrentWord("");
        });
      return;
    }

    // Check if the user just pressed space for a complete word. Add to pending words.
    if (newText.endsWith(" ") && currentWord) {
      const lastWordIndex = newText.lastIndexOf(currentWord);
      const pendingData: PendingWord = { word: currentWord, position: lastWordIndex };
      setPendingWords((prev) => [...prev, pendingData]);

      setCurrentWord("");
      return;
    }

    // Get the last word being typed
    const lastWord = newText.split(" ").pop() || "";
    setCurrentWord(lastWord);
  };

  const handleOptionSelect = (option: string) => {
    // Replace the last word with the selected option and add a space
    const words = text.split(" ");
    words.pop(); // Remove the last word (current input)

    const newText = [...words, option, ""].join(" ");

    setText(newText);
    setCurrentWord(""); // Reset current word
  };

  // Process each pending word individually.
  const processPendingWord = async (pendingData: PendingWord) => {
    try {
      const result = await transliterateWord(pendingData.word);
      const transliteration = getFirstTransliteration(result);

      setText((prevText) => {
        // Recalculate position based on current text state
        const currentPosition = prevText.lastIndexOf(pendingData.word, pendingData.position);
        if (currentPosition === -1) return prevText;

        return replaceWordAtPosition(prevText, currentPosition, pendingData.word, transliteration);
      });
    } catch (error) {
      showFailureToast("Translation error!", { message: String(error) });
    } finally {
      setPendingWords((prev) => prev.filter((p) => p.position !== pendingData.position));
    }
  };

  // Add useEffect to process pending words sequentially
  useEffect(() => {
    if (pendingWords.length > 0) {
      const [nextWord] = pendingWords;
      processPendingWord(nextWord);
    }
  }, [pendingWords]);

  function TransliterationActions({
    selectTitle,
    copyTitle,
    option,
    onSelect,
  }: {
    selectTitle: string;
    copyTitle: string;
    option: string;
    onSelect: (opt: string) => void;
  }) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            icon={Icon.ChevronRight}
            title={selectTitle}
            onAction={() => onSelect(option)}
            shortcut={{ modifiers: [], key: "return" }}
          />
          <Action.CopyToClipboard
            title={copyTitle}
            content={option.trim()}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function EmptyStateView({ text }: { text: string }) {
    return text === "" ? (
      <List.EmptyView
        icon="🔤"
        title="Start typing..."
        description="Type English text and get Arabic transliteration suggestions"
      />
    ) : (
      <List.EmptyView
        icon="↩️"
        title="Press ↵ to copy the full transliteration"
        description="or continue typing and select a suggestion when available"
      />
    );
  }

  return (
    <List
      searchText={text}
      onSearchTextChange={handleTextChange}
      searchBarPlaceholder="Type English letters for Arabic transliteration..."
      filtering={false}
      isLoading={transliterations.state === "loading"}
      selectedItemId={transliterationOptions.length > 0 ? "first-arabic-option" : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Full Transliteration" content={text.trim()} />
            <Action.Paste
              title="Paste Full Transliteration"
              content={text.trim()}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onPaste={(content) => {
                // First handle the current selection if there's a current word
                if (currentWord && transliterationOptions.length > 0) {
                  handleOptionSelect(transliterationOptions[0]);
                }
                // Then handle the pasted content
                handleOptionSelect(String(content));
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {EmptyStateView({ text })}
      {currentWord && (
        <List.Item
          id="english-input"
          title={currentWord}
          subtitle={display_number_shortcuts ? `⌘ 1` : ""}
          actions={
            <TransliterationActions
              selectTitle="Use Input Text"
              copyTitle="Copy Input Text"
              option={currentWord}
              onSelect={handleOptionSelect}
            />
          }
        />
      )}
      {transliterationOptions.map((option, index) => (
        <List.Item
          key={index}
          id={index === 0 ? "first-arabic-option" : `option-${index}`}
          title={option}
          subtitle={display_number_shortcuts ? `⌘ ${index + 2}` : ""}
          actions={
            <TransliterationActions
              selectTitle="Use This Transliteration"
              copyTitle="Copy This Transliteration"
              option={option}
              onSelect={handleOptionSelect}
            />
          }
        />
      ))}
    </List>
  );
}
