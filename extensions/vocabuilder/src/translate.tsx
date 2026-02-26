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
import { MAX_WORD_LENGTH, normalizeWordInput } from "./lib/input";
import { buildTranslationDetailMarkdown } from "./lib/markdown";
import { getHistory, saveTranslation } from "./lib/storage";
import { Translation } from "./lib/types";

interface Preferences {
  geminiApiKey: string;
  readClipboardOnOpen?: boolean;
}

const SECRET_PREFIX_RE = /^(sk-|ghp_|github_pat_|xox[baprs]-|AKIA|ASIA|AIza)/i;

function isSafeClipboardSuggestion(raw: string): boolean {
  const text = raw.trim();
  if (!text || text.includes("\n")) return false;
  if (SECRET_PREFIX_RE.test(text)) return false;
  return normalizeWordInput(text) !== null;
}

function getUserFacingErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "INVALID_API_KEY":
      return "Invalid API key. Please check your Gemini API key in preferences.";
    case "GEMINI_REQUEST_FAILED":
      return "Gemini request failed. Please try again.";
    case "GEMINI_EMPTY_RESPONSE":
    case "GEMINI_INVALID_RESPONSE":
      return "Gemini returned an unexpected response. Please try again.";
    case "INVALID_WORD_INPUT":
      return `Enter one English word (letters, apostrophe, hyphen, max ${MAX_WORD_LENGTH} chars).`;
    default:
      return "Translation failed. Please try again.";
  }
}

export default function Translate() {
  const { geminiApiKey, readClipboardOnOpen } =
    getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<Translation[]>([]);

  const [clipboardSuggestion, setClipboardSuggestion] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearDebounce() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function submitTranslation(rawText: string, clearPending = true) {
    if (clearPending) clearDebounce();
    const normalizedWord = normalizeWordInput(rawText);
    if (!normalizedWord) {
      setResult(null);
      setIsLoading(false);
      setError(getUserFacingErrorMessage("INVALID_WORD_INPUT"));
      return;
    }
    fetchTranslation(normalizedWord);
  }

  async function readClipboardSuggestion(): Promise<string | null> {
    const text = await Clipboard.readText();
    if (!text) return null;
    const trimmed = text.trim();
    return isSafeClipboardSuggestion(trimmed) ? trimmed : null;
  }

  async function handleReadClipboard() {
    try {
      const suggestion = await readClipboardSuggestion();
      if (!suggestion) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard not used",
          message: "Clipboard does not look like a single English word.",
        });
        return;
      }

      setClipboardSuggestion(suggestion);
      setSearchText(suggestion);
      fetchTranslation(suggestion);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard read failed",
      });
    }
  }

  useEffect(() => {
    getHistory().then((h) => setRecentHistory(h.slice(0, 5)));

    if (!readClipboardOnOpen) return;

    readClipboardSuggestion()
      .then((suggestion) => {
        if (suggestion) {
          setClipboardSuggestion(suggestion);
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [readClipboardOnOpen]);

  function handleSearchChange(text: string) {
    setSearchText(text);

    clearDebounce();

    if (!text.trim()) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setError(null);

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      submitTranslation(text, false);
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
      const saved = await saveTranslation(translation);
      if (saved) {
        setRecentHistory((prev) =>
          [translation, ...prev.filter((h) => h.word !== word)].slice(0, 5),
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Saved data is corrupted",
          message:
            "Translation was not written to storage to avoid overwriting existing data.",
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      const errorCode = err instanceof Error ? err.message : "UNKNOWN_ERROR";
      const userMessage = getUserFacingErrorMessage(errorCode);
      setError(userMessage);

      await showToast({
        style: Toast.Style.Failure,
        title: "Translation failed",
        message: userMessage,
      });
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }

  const showEmpty = !searchText.trim();
  const showRecent = showEmpty && recentHistory.length > 0;
  const normalizedSearchWord = normalizeWordInput(searchText);
  const showResult = !!result && result.word === normalizedSearchWord;
  const showManualSubmitItem =
    !showEmpty && !error && !showResult && !isLoading;

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
      ) : showResult && result ? (
        <List.Section title="Translation">
          <List.Item
            title={result.word}
            subtitle={result.translation}
            accessories={[{ tag: result.partOfSpeech }]}
            detail={
              <List.Item.Detail
                markdown={buildTranslationDetailMarkdown(result)}
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
      ) : showManualSubmitItem ? (
        <List.Section title="Translation">
          <List.Item
            title={`Translate "${searchText.trim()}"`}
            subtitle="Press Enter to translate immediately (auto-runs in 1.5s)"
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action
                  title="Translate Now"
                  icon={Icon.Book}
                  onAction={() => submitTranslation(searchText)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : showEmpty ? (
        <>
          <List.Section title="Clipboard">
            <List.Item
              title={clipboardSuggestion || "Read Clipboard"}
              subtitle={
                clipboardSuggestion
                  ? "Use the suggested clipboard word"
                  : "Read clipboard and validate safely"
              }
              icon={Icon.Clipboard}
              actions={
                <ActionPanel>
                  {clipboardSuggestion ? (
                    <Action
                      title="Translate Clipboard Word"
                      icon={Icon.Book}
                      onAction={() => {
                        setSearchText(clipboardSuggestion);
                        fetchTranslation(clipboardSuggestion);
                      }}
                    />
                  ) : (
                    <Action
                      title="Read Clipboard"
                      icon={Icon.Clipboard}
                      onAction={handleReadClipboard}
                    />
                  )}
                  <Action
                    title="Refresh Clipboard"
                    icon={Icon.ArrowClockwise}
                    onAction={handleReadClipboard}
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
      ) : null}
    </List>
  );
}
