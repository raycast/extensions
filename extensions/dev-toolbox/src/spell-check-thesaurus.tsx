import { List, showToast, Toast, ActionPanel, Action, Detail } from "@raycast/api";
import { useState } from "react";
import axios from "axios";

interface WordData {
  word: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
  synonyms: string[];
  antonyms: string[];
  phonetics: { text?: string; audio?: string }[];
}

interface Suggestion {
  word: string;
}

export default function SpellCheck() {
  const [results, setResults] = useState<WordData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchSuggestions = async (text: string) => {
    if (!text) {
      setSuggestions([]);
      return;
    }

    try {
      const { data } = await axios.get(`https://api.datamuse.com/sug?s=${encodeURIComponent(text)}`);
      setSuggestions(data);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to fetch suggestions" });
    }
  };

  const searchWord = async (word: string) => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      setResults(data[0]);
      setSuggestions([]);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Word not found, not in thesaurus" });
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return results ? (
    <WordDetails wordData={results} onReset={() => setResults(null)} />
  ) : (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter a word..."
      onSearchTextChange={async (text) => {
        await searchSuggestions(text);
        if (!text) setResults(null);
      }}
      throttle
    >
      <List.Section title="Suggestions">
        {suggestions.map((suggestion) => (
          <List.Item
            key={suggestion.word}
            title={suggestion.word}
            actions={
              <ActionPanel>
                <Action title="Lookup Word" onAction={() => searchWord(suggestion.word)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!suggestions.length && <List.EmptyView title="Type a word to get started" />}
    </List>
  );
}

function WordDetails({ wordData, onReset }: { wordData: WordData; onReset: () => void }) {
  const { word = "Unknown", phonetics = [], meanings = [], synonyms = [], antonyms = [] } = wordData || {};

  const phoneticText =
    phonetics
      .map((p) => p.text)
      .filter(Boolean)
      .join(", ") || "N/A";
  const phoneticAudio = phonetics.find((p) => p.audio)?.audio;

  const meaningsText = meanings.length
    ? meanings
        .map(
          (meaning) =>
            `### ${meaning.partOfSpeech}\n` +
            meaning.definitions
              .map(
                (def, index) =>
                  `**${index + 1}.** ${def.definition}\n` + (def.example ? `_Example:_ "${def.example}"` : ""),
              )
              .join("\n\n"),
        )
        .join("\n\n")
    : "No definitions available.";

  const synonymsText = synonyms.length ? synonyms.join(", ") : "N/A";
  const antonymsText = antonyms.length ? antonyms.join(", ") : "N/A";

  const markdownContent = `
# ${word}

**Phonetic:** ${phoneticText}

${phoneticAudio ? `[🔊 Listen](${phoneticAudio})` : ""}

## Meanings
${meaningsText}

## Synonyms
${synonymsText}

## Antonyms
${antonymsText}
  `;

  return (
    <Detail
      markdown={markdownContent}
      navigationTitle={word}
      actions={
        <ActionPanel>
          <Action title="Search Again" onAction={onReset} />
          {phoneticAudio && <Action.OpenInBrowser title="Listen to Pronunciation" url={phoneticAudio} />}
        </ActionPanel>
      }
    />
  );
}
