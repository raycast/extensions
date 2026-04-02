import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
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
import { LanguagePair, storageKeyPrefix, swapLanguagePair } from "./lib/languages";
import { posColor } from "./lib/colors";
import { buildTranslationDetailMarkdown, buildTextTranslationDetailMarkdown } from "./lib/markdown";
import { getHistory, saveTranslation } from "./lib/storage";
import { Translation, WordSense } from "./lib/types";

interface PendingWordTranslation {
  effectiveWord: string;
  originalInput: string;
  senses: WordSense[];
}

function pickSenseShortcut(index: number): { modifiers: "cmd"[]; key: "1" | "2" | "3" | "4" | "5" } | undefined {
  if (index < 0 || index > 4) return undefined;
  const keys: ("1" | "2" | "3" | "4" | "5")[] = ["1", "2", "3", "4", "5"];
  return { modifiers: ["cmd"], key: keys[index] };
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

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const [pendingWord, setPendingWord] = useState<PendingWordTranslation | null>(null);
  const [languagePair, setLanguagePair] = useState<LanguagePair | null>(langResult.pair);

  // Re-sync when preferences become valid after LanguageConfigError
  if (!languagePair && langResult.pair) {
    setLanguagePair(langResult.pair);
  }

  const [clipboardSuggestion, setClipboardSuggestion] = useState("");
  const [recentShowingDetail, setRecentShowingDetail] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pairKey = languagePair ? storageKeyPrefix(languagePair) : null;

  useEffect(() => {
    if (!languagePair) return;
    setRecentHistory([]);
    setRecentShowingDetail(false);
    let stale = false;

    getHistory(languagePair).then((h) => {
      if (!stale) setRecentHistory(h.slice(0, 5));
    });

    if (readClipboardOnOpen) {
      readClipboardSuggestion()
        .then((suggestion) => {
          if (!stale && suggestion) {
            setClipboardSuggestion(suggestion);
          }
        })
        .catch(() => {
          /* ignore */
        });
    }

    return () => {
      stale = true;
    };
  }, [readClipboardOnOpen, pairKey]);

  if (!languagePair) return <LanguageConfigError message={langResult.error ?? "Invalid language configuration."} />;
  const { source } = languagePair;

  function clearDebounce() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function handleToggleLanguages() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearDebounce();
    setResult(null);
    setError(null);
    setIsLoading(false);
    setSearchText("");
    setPendingWord(null);
    setClipboardSuggestion("");
    setRecentShowingDetail(false);

    setLanguagePair((prev) => {
      if (!prev) return prev;
      const swapped = swapLanguagePair(prev);
      showToast({
        style: Toast.Style.Success,
        title: `${swapped.source.name} → ${swapped.target.name}`,
      });
      return swapped;
    });
  }

  function ToggleLanguagesAction() {
    return (
      <Action
        title="Toggle Languages"
        icon={Icon.Switch}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onAction={handleToggleLanguages}
      />
    );
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
    setPendingWord(null);
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
      setPendingWord(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setRecentShowingDetail(false);
    setError(null);
    setResult(null);
    setPendingWord(null);
    setIsLoading(false);

    // Only auto-translate for word-like input
    if (normalizeWordInput(text) !== null) {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        submitTranslation(text, false);
      }, 1500);
    }
  }

  async function commitWordSense(pw: PendingWordTranslation, sense: WordSense) {
    if (!languagePair) return;
    const now = Date.now();
    const translation: Translation = {
      id: `${pw.effectiveWord}-${now}`,
      word: pw.effectiveWord,
      translation: sense.translation,
      partOfSpeech: sense.partOfSpeech,
      example: sense.example,
      exampleTranslation: sense.exampleTranslation,
      timestamp: now,
      type: "word",
    };

    const saved = await saveTranslation(translation, languagePair);
    if (!saved) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Saved data is corrupted",
        message: "Translation was not written to storage to avoid overwriting existing data.",
      });
      return;
    }

    await Clipboard.copy(saved.translation);
    setPendingWord(null);
    setResult(null);
    setSearchText("");
    clearDebounce();
    setRecentHistory((prev) => [saved, ...prev.filter((h) => h.id !== saved.id)].slice(0, 5));
    await closeMainWindow({ clearRootSearch: true });
  }

  async function fetchWordTranslation(word: string) {
    if (abortRef.current) abortRef.current.abort();
    if (!languagePair) return;
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setPendingWord(null);

    try {
      const geminiResult = await translateWord(word, geminiApiKey, languagePair, controller.signal);

      if (controller.signal.aborted) return;

      const corrected = geminiResult.correctedWord;
      const effectiveWord = corrected && corrected !== word ? corrected : word;

      setPendingWord({
        effectiveWord,
        originalInput: word,
        senses: geminiResult.senses,
      });
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
    if (!languagePair) return;
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setPendingWord(null);

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
        setResult(saved);
        setRecentHistory((prev) => [saved, ...prev.filter((h) => h.id !== saved.id)].slice(0, 5));
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
  const showSensePicker = !!pendingWord && !isLoading;
  const showManualSubmitItem = !showEmpty && !error && !showResult && !isLoading && !showSensePicker;

  return (
    <List
      navigationTitle={`${languagePair.source.name} → ${languagePair.target.name}`}
      isLoading={isLoading}
      isShowingDetail={
        (showResult && isTextResult) || showSensePicker || (showEmpty && showRecent && recentShowingDetail)
      }
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
              <ToggleLanguagesAction />
            </ActionPanel>
          }
        />
      ) : showSensePicker && pendingWord ? (
        <List.Section
          title="Choose Translation"
          subtitle="Primary action saves to history, flashcards, and copies — Enter"
        >
          {pendingWord.senses.map((sense, index) => {
            const detailTranslation: Translation = {
              id: `pick-${index}`,
              word: pendingWord.effectiveWord,
              translation: sense.translation,
              partOfSpeech: sense.partOfSpeech,
              example: sense.example,
              exampleTranslation: sense.exampleTranslation,
              timestamp: Date.now(),
              type: "word",
            };
            const pickShortcut = pickSenseShortcut(index);
            return (
              <List.Item
                key={`${sense.translation}-${index}`}
                title={sense.translation}
                subtitle={sense.partOfSpeech}
                accessories={[
                  ...(index === 0 && pendingWord.effectiveWord !== pendingWord.originalInput
                    ? [{ tag: { value: `corrected from "${pendingWord.originalInput}"`, color: Color.Orange } }]
                    : []),
                  { tag: { value: sense.partOfSpeech, color: posColor(sense.partOfSpeech) } },
                  { text: `#${index + 1}` },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildTranslationDetailMarkdown(detailTranslation, pendingWord.originalInput)}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Save to History and Copy"
                      icon={Icon.CheckCircle}
                      shortcut={pickShortcut}
                      onAction={() => commitWordSense(pendingWord, sense)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Only"
                      content={sense.translation}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Open History"
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                      onAction={() => push(<History languagePair={languagePair} />)}
                    />
                    <ToggleLanguagesAction />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : showResult && result && result.type === "text" ? (
        <List.Section title="Translation">
          <List.Item
            title={truncate(result.word, 60)}
            subtitle={truncate(result.translation, 60)}
            accessories={[{ tag: { value: "text", color: Color.Purple } }]}
            detail={<List.Item.Detail markdown={buildTextTranslationDetailMarkdown(result.word, result.translation)} />}
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
                  onAction={() => push(<History languagePair={languagePair} />)}
                />
                <ToggleLanguagesAction />
              </ActionPanel>
            }
          />
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
                <ToggleLanguagesAction />
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
              detail={<List.Item.Detail markdown={clipboardSuggestion ? `**${clipboardSuggestion}**` : ""} />}
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
                  <ToggleLanguagesAction />
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
                  subtitle={
                    recentShowingDetail
                      ? undefined
                      : item.type === "text"
                        ? truncate(item.translation, 60)
                        : item.translation
                  }
                  accessories={[
                    item.type === "text"
                      ? { tag: { value: "text", color: Color.Purple } }
                      : { tag: { value: item.partOfSpeech, color: posColor(item.partOfSpeech) } },
                    { text: relativeTime(item.timestamp) },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={
                        item.type === "text"
                          ? buildTextTranslationDetailMarkdown(item.word, item.translation)
                          : buildTranslationDetailMarkdown(item)
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title={recentShowingDetail ? "Hide Detail" : "Show Detail"}
                        icon={Icon.Sidebar}
                        onAction={() => setRecentShowingDetail((v) => !v)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Translation"
                        content={item.translation}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Open History"
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={() => push(<History languagePair={languagePair} />)}
                      />
                      <ToggleLanguagesAction />
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
