import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { useFetchTransliteration, TransliterationResult, fetchTransliteration } from "./fetchdata";

// Add a cache for transliteration results keyed by the word.
const transliterationCache = new Map<string, TransliterationResult>();

// Helper function to get the best transliteration for a word
const getFirstTransliteration = (result: TransliterationResult): string => {
  return result.state === "success" && result.options.length > 0 ? result.options[0] : result.originalText;
};

// Helper function to translate a word (using cache or API)
const translateWord = async (word: string): Promise<TransliterationResult> => {
  const cached = transliterationCache.get(word);
  if (cached) return cached;

  const result = await fetchTransliteration(word);
  transliterationCache.set(word, result);
  return result;
};

export default function Command() {
  const [text, setText] = useState("");
  const [currentWord, setCurrentWord] = useState("");

  // Remove the old pending word states and use a queue to track multiple words.
  type PendingWord = {
    word: string;
    position: number;
  };

  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);

  // Get inline transliterations only for the current (not yet space-terminated) word
  const transliterations = useFetchTransliteration(currentWord);

  // Handle the transliteration results
  const transliterationOptions = transliterations.state === "success" ? transliterations.options : [];

  // Helper function to replace word at position with replacement
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
        translateWord(word).catch((error) => ({
          state: "error",
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

    // Check if the user just pressed space for a complete word.
    if (newText.endsWith(" ") && currentWord) {
      const lastWordIndex = newText.lastIndexOf(currentWord);
      const pendingData: PendingWord = { word: currentWord, position: lastWordIndex };
      setPendingWords((prev) => [...prev, pendingData]);

      // Process this pending word immediately.
      processPendingWord(pendingData);

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

    // Add zero-width non-joiner after Arabic text and between words
    const processedWords = words.map((w) => w);
    const newText = [...processedWords, option, ""].join(" ");

    setText(newText);
    setCurrentWord(""); // Reset current word
  };

  // Process each pending word individually.
  const processPendingWord = async (pendingData: PendingWord) => {
    try {
      const result = await translateWord(pendingData.word);
      const transliteration = getFirstTransliteration(result);

      setText((prevText) => {
        // Recalculate position based on current text state
        const currentPosition = prevText.lastIndexOf(pendingData.word, pendingData.position);
        if (currentPosition === -1) return prevText;

        return replaceWordAtPosition(prevText, currentPosition, pendingData.word, transliteration);
      });
    } catch (error) {
      console.error("Translation error:", error);
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

  function CopyActions({ content }: { content: string }) {
    return (
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Full Text"
          content={content.trim()}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </ActionPanel.Section>
    );
  }

  function TransliterationActions({ option, onSelect }: { option: string; onSelect: (opt: string) => void }) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Use This Transliteration"
            onAction={() => onSelect(option)}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel.Section>
        <CopyActions content={option} />
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
        title="Press ↵ to copy the whole text"
        description="or select a suggestion when available"
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
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Full Text"
              content={text.trim()}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
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
          subtitle="Keep Input"
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Use English Text"
                  onAction={() => handleOptionSelect(currentWord)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy English Text"
                  content={currentWord}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      )}
      {transliterationOptions.map((option, index) => (
        <List.Item
          key={index}
          id={index === 0 ? "first-arabic-option" : `option-${index}`}
          title={option}
          actions={<TransliterationActions option={option} onSelect={handleOptionSelect} />}
        />
      ))}
    </List>
  );
}
