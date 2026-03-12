import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import LanguageConfigError from "./components/LanguageConfigError";
import { useLanguagePair } from "./hooks/useLanguagePair";
import History from "./history";
import { translateWord, translateText } from "./lib/gemini";
import { MAX_WORD_LENGTH, normalizeWordInput, normalizeTextInput } from "./lib/input";
import { posColor } from "./lib/colors";
import { buildTranslationDetailMarkdown, buildTextTranslationDetailMarkdown } from "./lib/markdown";
import { getHistory, saveTranslation } from "./lib/storage";
import { Translation } from "./lib/types";

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
      return `Enter one word (letters, apostrophe, hyphen, max ${MAX_WORD_LENGTH} chars).`;
    case "INVALID_TEXT_INPUT":
      return "Text is empty or too long.";
    default:
      return "Translation failed. Please try again.";
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export default function Translate() {
  const { geminiApiKey, readClipboardOnOpen } = getPreferenceValues<Preferences.Translate>();
  const langResult = useLanguagePair();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<Translation[]>([]);
  const [originalInput, setOriginalInput] = useState<string | undefined>(undefined);

  const [clipboardSuggestion, setClipboardSuggestion] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!langResult.pair) return;

    getHistory(langResult.pair).then((h) => setRecentHistory(h.slice(0, 5)));

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

  if (langResult.error) return <LanguageConfigError message={langResult.error} />;
  const languagePair = langResult.pair;
  const { source } = languagePair;

  function clearDebounce() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function submitTranslation(rawText: string, clearPending = true) {
    if (clearPending) clearDebounce();

    const normalizedWord = normalizeWordInput(rawText);
    if (normalizedWord) {
      fetchWordTranslation(normalizedWord);
      return;
    }

    const normalizedText = normalizeTextInput(rawText);
    if (normalizedText) {
      fetchTextTranslation(normalizedText);
      return;
    }

    setResult(null);
    setIsLoading(false);
    setError(getUserFacingErrorMessage("INVALID_TEXT_INPUT"));
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
          message: "Clipboard does not look like a single word.",
        });
        return;
      }

      setClipboardSuggestion(suggestion);
      setSearchText(suggestion);
      fetchWordTranslation(suggestion);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard read failed",
      });
    }
  }

  function handleSearchChange(text: string) {
    setSearchText(text);

    clearDebounce();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!text.trim()) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setResult(null);
    setIsLoading(false);

    // Only auto-translate for word-like input
    if (normalizeWordInput(text) !== null) {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        submitTranslation(text, false);
      }, 1500);
    }
  }

  async function fetchWordTranslation(word: string) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setOriginalInput(word);

    try {
      const geminiResult = await translateWord(word, geminiApiKey, languagePair, controller.signal);

      if (controller.signal.aborted) return;

      const corrected = geminiResult.correctedWord;
      const effectiveWord = corrected && corrected !== word ? corrected : word;

      const translation: Translation = {
        id: `${effectiveWord}-${Date.now()}`,
        word: effectiveWord,
        translation: geminiResult.translation,
        partOfSpeech: geminiResult.partOfSpeech,
        example: geminiResult.example,
        exampleTranslation: geminiResult.exampleTranslation,
        timestamp: Date.now(),
        type: "word",
      };

      setResult(translation);

      const saved = await saveTranslation(translation, languagePair);
      if (saved) {
        setRecentHistory((prev) => [translation, ...prev.filter((h) => h.word !== translation.word)].slice(0, 5));
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Saved data is corrupted",
          message: "Translation was not written to storage to avoid overwriting existing data.",
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

  async function fetchTextTranslation(text: string) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setOriginalInput(text);

    try {
      const geminiResult = await translateText(text, geminiApiKey, languagePair, controller.signal);

      if (controller.signal.aborted) return;

      const translation: Translation = {
        id: `text-${Date.now()}`,
        word: text,
        translation: geminiResult.translation,
        partOfSpeech: "text",
        example: "",
        exampleTranslation: "",
        timestamp: Date.now(),
        type: "text",
      };

      setResult(translation);

      const saved = await saveTranslation(translation, languagePair);
      if (saved) {
        setRecentHistory((prev) => [translation, ...prev.filter((h) => h.word !== translation.word)].slice(0, 5));
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Saved data is corrupted",
          message: "Translation was not written to storage to avoid overwriting existing data.",
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
  const showResult = !!result && !isLoading;
  const isTextResult = result?.type === "text";
  const isWordInput = normalizeWordInput(searchText) !== null;
  const showManualSubmitItem = !showEmpty && !error && !showResult && !isLoading;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showResult && isTextResult}
      searchBarPlaceholder={`Type a ${source.name} word or text...`}
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
                <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              )}
            </ActionPanel>
          }
        />
      ) : showResult && result ? (
        <List.Section title="Translation">
          {isTextResult ? (
            <List.Item
              title={truncate(result.word, 60)}
              subtitle={truncate(result.translation, 60)}
              accessories={[{ tag: { value: "text", color: Color.Purple } }]}
              detail={
                <List.Item.Detail markdown={buildTextTranslationDetailMarkdown(result.word, result.translation)} />
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
          ) : (
            <List.Item
              title={result.word}
              subtitle={result.translation}
              accessories={[
                ...(result.word !== originalInput
                  ? [{ tag: { value: `corrected from "${originalInput}"`, color: Color.Orange } }]
                  : []),
                { tag: { value: result.partOfSpeech, color: posColor(result.partOfSpeech) } },
              ]}
              detail={<List.Item.Detail markdown={buildTranslationDetailMarkdown(result, originalInput)} />}
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
          )}
        </List.Section>
      ) : showManualSubmitItem ? (
        <List.Section title="Translation">
          <List.Item
            title={`Translate "${truncate(searchText.trim(), 40)}"`}
            subtitle={
              isWordInput ? "Press Enter to translate immediately (auto-runs in 1.5s)" : "Press Enter to translate"
            }
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action title="Translate Now" icon={Icon.Book} onAction={() => submitTranslation(searchText)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : showEmpty ? (
        <>
          <List.Section title="Clipboard">
            <List.Item
              title={clipboardSuggestion || "Read Clipboard"}
              subtitle={clipboardSuggestion ? "Use the suggested clipboard word" : "Read clipboard and validate safely"}
              icon={Icon.Clipboard}
              actions={
                <ActionPanel>
                  {clipboardSuggestion ? (
                    <Action
                      title="Translate Clipboard Word"
                      icon={Icon.Book}
                      onAction={() => {
                        setSearchText(clipboardSuggestion);
                        fetchWordTranslation(clipboardSuggestion);
                      }}
                    />
                  ) : (
                    <Action title="Read Clipboard" icon={Icon.Clipboard} onAction={handleReadClipboard} />
                  )}
                  <Action title="Refresh Clipboard" icon={Icon.ArrowClockwise} onAction={handleReadClipboard} />
                </ActionPanel>
              }
            />
          </List.Section>
          {showRecent && (
            <List.Section title="Recent">
              {recentHistory.map((item) => (
                <List.Item
                  key={item.id}
                  title={item.type === "text" ? truncate(item.word, 60) : item.word}
                  subtitle={item.type === "text" ? truncate(item.translation, 40) : item.translation}
                  accessories={[
                    item.type === "text"
                      ? { tag: { value: "text", color: Color.Purple } }
                      : { tag: { value: item.partOfSpeech, color: posColor(item.partOfSpeech) } },
                  ]}
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
      ) : isLoading ? (
        <List.EmptyView title="Translating…" icon={Icon.Book} />
      ) : null}
    </List>
  );
}
