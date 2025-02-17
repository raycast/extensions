import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { useFetchTransliteration, TransliterationResult, fetchTransliteration } from "./fetchdata";

export default function Command() {
  const [text, setText] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState("");
  const [pendingSpaceSelection, setPendingSpaceSelection] = useState(false);

  // Get transliterations for the current word being typed
  const transliterations = useFetchTransliteration(pendingSpaceSelection ? pendingWord : currentWord);

  // Handle the transliteration results
  const transliterationOptions = transliterations.state === "success" ? transliterations.options : [];

  // Effect to handle delayed API response when space was pressed
  useEffect(() => {
    if (pendingSpaceSelection && transliterations.state === "success" && transliterations.options.length > 0) {
      // Find and replace the pending word in the text
      const pendingWordPosition = text.lastIndexOf(transliterations.originalText);
      if (pendingWordPosition !== -1) {
        const newText =
          text.substring(0, pendingWordPosition) +
          transliterations.options[0] +
          text.substring(pendingWordPosition + transliterations.originalText.length);
        setText(newText);
      }
      setCurrentWord("");
      setPendingWord("");
      setPendingSpaceSelection(false);
    }
  }, [transliterations, pendingSpaceSelection]);

  type TransliterationResponse = {
    result: TransliterationResult;
    originalWord: string;
    index: number;
  };

  const handleTextChange = (newText: string) => {
    setText(newText);

    // If this is a paste operation (multiple words)
    if (newText.includes(" ") && newText.split(" ").length > text.split(" ").length + 1) {
      const words = newText.split(" ");

      Promise.all<TransliterationResponse>(
        words.map((word, index) =>
          fetchTransliteration(word)
            .then((result) => ({ result, originalWord: word, index }))
            .catch((error) => {
              return {
                result: { state: "error", message: error.message } as TransliterationResult,
                originalWord: word,
                index,
              };
            }),
        ),
      )
        .then((results) => {
          const transliteratedWords = results.map(({ result, originalWord }) => {
            if (result.state === "error") {
              return originalWord;
            }
            if (result.state === "success") {
              return result.options.length > 0 ? result.options[0] : result.originalText;
            }
            return originalWord;
          });

          setText(transliteratedWords.join(" ") + " ");
          setCurrentWord("");
        })
        .catch(() => {
          setText(newText);
          setCurrentWord("");
        });
      return;
    }

    // Check if the user just pressed space
    if (newText.endsWith(" ") && currentWord) {
      if (transliterationOptions.length > 0) {
        handleOptionSelect(transliterationOptions[0]);
      } else {
        setPendingWord(currentWord);
        setPendingSpaceSelection(true);
      }
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

  function TranslationActions({ option, onSelect }: { option: string; onSelect: (opt: string) => void }) {
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
          actions={<TranslationActions option={option} onSelect={handleOptionSelect} />}
        />
      ))}
    </List>
  );
}
