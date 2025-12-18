import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { lookupWord } from "./api/dictionary";
import { playAudio, getAccentFromUrl, speakWord, VOICES } from "./utils/audio";
import { useHistory } from "./hooks/useHistory";
import { PronunciationResult } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<PronunciationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    history,
    isLoading: isHistoryLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useHistory();

  // Search when user stops typing
  useEffect(() => {
    if (!searchText.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const data = await lookupWord(searchText);
        setResults(data);

        // Add to history on successful search
        if (data.length > 0) {
          await addToHistory(searchText);
        }
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Failed to lookup word");
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchText, addToHistory]);

  const handlePlayAudio = async (audioUrl?: string) => {
    if (!audioUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No audio available",
      });
      return;
    }
    await playAudio(audioUrl);
  };

  const isLoading = isSearching || isHistoryLoading;
  const showHistory = !searchText.trim() && history.length > 0;
  const showResults = searchText.trim() && results.length > 0;
  const showError = error && !isSearching;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a word to look up pronunciation..."
      throttle
    >
      {showError && (
        <List.Section
          title={`"${searchText}" not found in dictionary - Use Text-to-Speech`}
        >
          <List.Item
            key="tts-us"
            icon={Icon.SpeakerHigh}
            title={searchText}
            subtitle="🇺🇸 US English (Samantha)"
            actions={
              <ActionPanel>
                <Action
                  title="Speak with Us Accent"
                  icon={Icon.Play}
                  onAction={() => speakWord(searchText, VOICES.us)}
                />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={searchText}
                />
              </ActionPanel>
            }
          />
          <List.Item
            key="tts-uk"
            icon={Icon.SpeakerHigh}
            title={searchText}
            subtitle="🇬🇧 UK English (Daniel)"
            actions={
              <ActionPanel>
                <Action
                  title="Speak with Uk Accent"
                  icon={Icon.Play}
                  onAction={() => speakWord(searchText, VOICES.uk)}
                />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={searchText}
                />
              </ActionPanel>
            }
          />
          <List.Item
            key="tts-au"
            icon={Icon.SpeakerHigh}
            title={searchText}
            subtitle="🇦🇺 Australian English (Karen)"
            actions={
              <ActionPanel>
                <Action
                  title="Speak with Australian Accent"
                  icon={Icon.Play}
                  onAction={() => speakWord(searchText, VOICES.au)}
                />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={searchText}
                />
              </ActionPanel>
            }
          />
          <List.Item
            key="tts-in"
            icon={Icon.SpeakerHigh}
            title={searchText}
            subtitle="🇮🇳 Indian English (Veena)"
            actions={
              <ActionPanel>
                <Action
                  title="Speak with Indian Accent"
                  icon={Icon.Play}
                  onAction={() => speakWord(searchText, VOICES.in)}
                />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={searchText}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {showResults && (
        <List.Section title={`Pronunciations for "${searchText}"`}>
          {results.map((result, index) => (
            <List.Item
              key={`${result.word}-${index}`}
              icon={result.audioUrl ? Icon.SpeakerHigh : Icon.SpeakerOff}
              title={result.word}
              subtitle={result.ipa ? `${result.ipa}` : undefined}
              accessories={[
                { text: result.partOfSpeech },
                { tag: getAccentFromUrl(result.audioUrl) },
              ]}
              actions={
                <ActionPanel>
                  {result.audioUrl && (
                    <Action
                      title="Play Pronunciation"
                      icon={Icon.Play}
                      onAction={() => handlePlayAudio(result.audioUrl)}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Ipa"
                    content={result.ipa || result.word}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Word"
                    content={result.word}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {result.definition && (
                    <Action.CopyToClipboard
                      title="Copy Definition"
                      content={result.definition}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {showHistory && (
        <List.Section title="Recent Searches">
          {history.map((item) => (
            <List.Item
              key={item.word}
              icon={Icon.Clock}
              title={item.word}
              accessories={[
                { date: new Date(item.timestamp), tooltip: "Searched on" },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Search Again"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => setSearchText(item.word)}
                  />
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => removeFromHistory(item.word)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={clearHistory}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!showHistory && !showResults && !showError && !isLoading && (
        <List.EmptyView
          icon={Icon.Book}
          title="Pronunciation Lookup"
          description="Type a word to find its pronunciation and IPA"
        />
      )}
    </List>
  );
}
