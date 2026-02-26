import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import History from "./history";
import { translateWord } from "./lib/gemini";
import { getHistory, saveTranslation } from "./lib/storage";
import { Translation } from "./lib/types";

interface Preferences {
  geminiApiKey: string;
}

export default function Translate() {
  const { geminiApiKey } = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<Translation[]>([]);

  const [clipboardSuggestion, setClipboardSuggestion] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getHistory().then((h) => setRecentHistory(h.slice(0, 5)));

    Clipboard.readText()
      .then((text) => {
        if (
          text &&
          text.trim().length > 0 &&
          text.length <= 50 &&
          !text.includes("\n")
        ) {
          setClipboardSuggestion(text.trim());
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  function handleSearchChange(text: string) {
    setSearchText(text);

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchTranslation(text.trim());
    }, 1500);
  }

  async function fetchTranslation(word: string) {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const geminiResult = await translateWord(
        word,
        geminiApiKey,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      const translation: Translation = {
        id: `${word}-${Date.now()}`,
        word,
        translation: geminiResult.translation,
        partOfSpeech: geminiResult.partOfSpeech,
        example: geminiResult.example,
        exampleTranslation: geminiResult.exampleTranslation,
        timestamp: Date.now(),
      };

      setResult(translation);

      // Auto-save
      await saveTranslation(translation);
      setRecentHistory((prev) =>
        [translation, ...prev.filter((h) => h.word !== word)].slice(0, 5),
      );
    } catch (err) {
      if (controller.signal.aborted) return;

      const message = err instanceof Error ? err.message : String(err);
      if (message === "INVALID_API_KEY") {
        setError(
          "Invalid API key. Please check your Gemini API key in preferences.",
        );
      } else {
        setError(message);
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Translation failed",
        message: message === "INVALID_API_KEY" ? "Invalid API key" : message,
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }

  const showEmpty = !searchText.trim();
  const showClipboard = showEmpty && !!clipboardSuggestion;
  const showRecent = showEmpty && recentHistory.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type an English word..."
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
    >
      {error ? (
        <List.EmptyView
          title="Translation Error"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              {error.includes("API key") && (
                <Action
                  title="Open Preferences"
                  onAction={openExtensionPreferences}
                  icon={Icon.Gear}
                />
              )}
            </ActionPanel>
          }
        />
      ) : result ? (
        <List.Section title="Translation">
          <List.Item
            title={result.word}
            subtitle={result.translation}
            accessories={[{ tag: result.partOfSpeech }]}
            detail={
              <List.Item.Detail
                markdown={`## ${result.word}\n\n**${result.translation}** *(${result.partOfSpeech})*\n\n---\n\n**Example:**\n\n> ${result.example}\n\n*${result.exampleTranslation}*`}
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={result.translation}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Open History"
                  icon={Icon.Clock}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  onAction={() => push(<History />)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : showClipboard ? (
        <>
          <List.Section title="Clipboard">
            <List.Item
              title={clipboardSuggestion}
              icon={Icon.Clipboard}
              actions={
                <ActionPanel>
                  <Action
                    title="Translate"
                    icon={Icon.Book}
                    onAction={() => {
                      setSearchText(clipboardSuggestion);
                      fetchTranslation(clipboardSuggestion);
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          {showRecent && (
            <List.Section title="Recent">
              {recentHistory.map((item) => (
                <List.Item
                  key={item.id}
                  title={item.word}
                  subtitle={item.translation}
                  accessories={[{ tag: item.partOfSpeech }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Translation"
                        content={item.translation}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Open History"
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={() => push(<History />)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      ) : showRecent ? (
        <List.Section title="Recent">
          {recentHistory.map((item) => (
            <List.Item
              key={item.id}
              title={item.word}
              subtitle={item.translation}
              accessories={[{ tag: item.partOfSpeech }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Translation"
                    content={item.translation}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Open History"
                    icon={Icon.Clock}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                    onAction={() => push(<History />)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
