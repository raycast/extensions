import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  getPreferenceValues,
  List,
  showHUD,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useMemo } from "react";

interface Preferences {
  primaryAction: "paste" | "copy";
  showHud: boolean;
  closeAfterAction: boolean;
  showSuggestionsForCorrectWords: boolean;
  language: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  // Build osascript arguments - each -e flag adds a line of AppleScript
  // Returns "CORRECT" or "INCORRECT" on first line, then suggestions
  const osascriptArgs = useMemo(() => {
    if (!searchText.trim()) return [];
    const word = searchText.trim().replace(/"/g, '\\"');
    const lang = preferences.language;
    return [
      "-e",
      'use framework "AppKit"',
      "-e",
      `set theWord to "${word}"`,
      "-e",
      "set spellChecker to current application's NSSpellChecker's sharedSpellChecker()",
      "-e",
      "set misspelledRange to spellChecker's checkSpellingOfString:theWord startingAt:0",
      "-e",
      "if (misspelledRange's |length|) = 0 then",
      "-e",
      'set output to "CORRECT" & linefeed',
      "-e",
      "else",
      "-e",
      'set output to "INCORRECT" & linefeed',
      "-e",
      "end if",
      "-e",
      `set guesses to spellChecker's guessesForWordRange:{0, length of theWord} inString:theWord language:"${lang}" inSpellDocumentWithTag:0`,
      "-e",
      "repeat with guess in guesses",
      "-e",
      "set output to output & (guess as text) & linefeed",
      "-e",
      "end repeat",
      "-e",
      "return output",
    ];
  }, [searchText, preferences.language]);

  const { data, isLoading } = useExec("osascript", osascriptArgs, {
    execute: searchText.trim().length > 0,
  });

  const { isCorrectlySpelled, suggestions } = useMemo(() => {
    if (!data) return { isCorrectlySpelled: false, suggestions: [] };
    const lines = data
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const isCorrect = lines[0] === "CORRECT";
    const suggestionList = lines.slice(1);
    return { isCorrectlySpelled: isCorrect, suggestions: suggestionList };
  }, [data]);

  // Build actions panel based on preferences
  const buildActions = (word: string) => {
    const pasteAction = (
      <Action
        key="paste"
        title="Paste to Active App"
        onAction={async () => {
          await Clipboard.paste(word);
          if (preferences.showHud) {
            await showHUD(`Pasted: ${word}`);
          }
          if (preferences.closeAfterAction) {
            await closeMainWindow();
          }
        }}
      />
    );
    const copyAction = (
      <Action.CopyToClipboard
        key="copy"
        title="Copy to Clipboard"
        content={word}
        onCopy={() => {
          if (preferences.closeAfterAction) {
            closeMainWindow();
          }
        }}
      />
    );

    // Return actions in order based on preference
    if (preferences.primaryAction === "paste") {
      return (
        <ActionPanel>
          {pasteAction}
          {copyAction}
        </ActionPanel>
      );
    } else {
      return (
        <ActionPanel>
          {copyAction}
          {pasteAction}
        </ActionPanel>
      );
    }
  };

  // Filter suggestions based on preference
  const displaySuggestions =
    isCorrectlySpelled && !preferences.showSuggestionsForCorrectWords
      ? []
      : suggestions;

  return (
    <List
      isLoading={isLoading && searchText.trim().length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a word to check spelling..."
      throttle
    >
      {searchText.trim().length === 0 ? (
        <List.EmptyView
          title="Type a word to check spelling"
          description="Suggestions will appear as you type"
        />
      ) : (
        <>
          {isCorrectlySpelled && (
            <List.Item
              key="correct-spelling"
              title={searchText.trim()}
              accessories={[{ tag: { value: "Correct", color: Color.Green } }]}
              actions={buildActions(searchText.trim())}
            />
          )}
          {displaySuggestions.map((suggestion, index) => (
            <List.Item
              key={`${suggestion}-${index}`}
              title={suggestion}
              actions={buildActions(suggestion)}
            />
          ))}
        </>
      )}
    </List>
  );
}
