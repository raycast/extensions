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
import PronounceAction from "./components/PronounceAction";
import LanguageConfigError from "./components/LanguageConfigError";
import LanguagePairDropdown from "./components/LanguagePairDropdown";
import { useLanguagePair } from "./hooks/useLanguagePair";
import History from "./history";
import { translateWord, translateText } from "./lib/gemini";
import { defaultToastFor } from "./lib/errorToast";
import { geminiError, isGeminiError } from "./lib/geminiError";
import { getPreferenceDefault } from "./lib/manifest";
import { looksLikeWordAttempt, normalizeWordInput, normalizeTextInput } from "./lib/input";
import { storageKeyPrefix } from "./lib/languages";
import { languagePairTitle, languagePairValue, swapLanguagePair } from "./lib/languageSession";
import { posColor } from "./lib/colors";
import { TranslationDetail } from "./components/TranslationDetail";
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

// Codes that surface a Retry button. See AGENTS.md → Error Handling (Retry policy).
// Wider than isTransient: empty-response and invalid-response are NOT auto-retried
// (Gemini already responded, just badly) but a human-triggered retry is still worth
// offering since the next call may produce a usable response.
const RETRYABLE_ERROR_CODES = new Set<string>([
  "network-offline",
  "request-failed",
  "empty-response",
  "invalid-response",
]);

const SECRET_PREFIX_RE = /^(sk-|ghp_|github_pat_|xox[baprs]-|AKIA|ASIA|AIza)/i;

function isSafeClipboardSuggestion(raw: string): boolean {
  const text = raw.trim();
  if (!text || text.includes("\n")) return false;
  if (SECRET_PREFIX_RE.test(text)) return false;
  return normalizeWordInput(text) !== null;
}

type ErrorDescription = { code: string; title: string; message: string };

// UNKNOWN_ERROR is the catch-all for AbortError and genuinely unexpected throws;
// everything recognized routes through defaultToastFor.
function describeError(err: unknown): ErrorDescription {
  if (isGeminiError(err)) {
    const { title, message } = defaultToastFor(err.cause);
    return { code: err.cause.kind, title, message };
  }
  return { code: "UNKNOWN_ERROR", title: "Translation failed", message: "Translation failed. Please try again." };
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

function ToggleLanguagesAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title="Toggle Languages"
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      onAction={onAction}
    />
  );
}

export default function Translate() {
  const { geminiApiKey, readClipboardOnOpen, translationModelPreset, translationModel, reasoningLevel } =
    getPreferenceValues<Preferences.Translate>();
  const model = translationModel?.trim() || translationModelPreset || getPreferenceDefault("translationModelPreset");
  const langResult = useLanguagePair();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<Translation[]>([]);
  const [pendingWord, setPendingWord] = useState<PendingWordTranslation | null>(null);
  const [clipboardSuggestion, setClipboardSuggestion] = useState("");
  const [recentShowingDetail, setRecentShowingDetail] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const languagePair = langResult.pair;
  const defaultPair = langResult.defaultPair;
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

  if (!languagePair || !defaultPair) {
    return <LanguageConfigError message={langResult.error ?? "Invalid language configuration."} />;
  }

  const activePair = languagePair;
  const activeDefaultPair = defaultPair;
  const { source } = activePair;

  function clearDebounce() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function resetForLanguagePairChange() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearDebounce();
    setResult(null);
    setError(null);
    setErrorCode(null);
    setIsLoading(false);
    setSearchText("");
    setPendingWord(null);
    setClipboardSuggestion("");
    setRecentShowingDetail(false);
    setRecentHistory([]);
  }

  async function handleLanguagePairChange(value: string) {
    if (value === pairKey) return;
    resetForLanguagePairChange();

    const selected = await langResult.selectPairValue(value);
    if (!selected) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid language pair",
        message: "Choose one of the supported language pairs.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: languagePairTitle(selected),
    });
  }

  function handleToggleLanguages() {
    const swapped = swapLanguagePair(activePair);
    void handleLanguagePairChange(languagePairValue(swapped));
  }

  function submitTranslation(rawText: string, clearPending = true) {
    if (clearPending) clearDebounce();

    const normalizedWord = normalizeWordInput(rawText);
    if (normalizedWord) {
      fetchWordTranslation(normalizedWord);
      return;
    }

    // Short, no-space inputs that failed the word/phrase regex (e.g. "fahj89sdf")
    // are almost certainly junk, not sentences — reject with a word-level error
    // instead of sending them down the lenient text-translation path.
    if (looksLikeWordAttempt(rawText)) {
      setResult(null);
      setPendingWord(null);
      setIsLoading(false);
      const desc = describeError(geminiError({ domain: "outcome", kind: "invalid-word-input", surface: "translate" }));
      setErrorCode(desc.code);
      setError(desc.message);
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
    const desc = describeError(geminiError({ domain: "outcome", kind: "invalid-text-input", surface: "translate" }));
    setErrorCode(desc.code);
    setError(desc.message);
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
          message: "Clipboard does not look like a word or short phrase.",
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
      setErrorCode(null);
      setIsLoading(false);
      return;
    }

    setRecentShowingDetail(false);
    setError(null);
    setErrorCode(null);
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
    setErrorCode(null);
    setResult(null);
    setPendingWord(null);

    try {
      const geminiResult = await translateWord(word, geminiApiKey, languagePair, controller.signal, {
        model,
        reasoningLevel,
      });

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

      const { code, title, message } = describeError(err);
      setErrorCode(code);
      setError(message);

      await showToast({ style: Toast.Style.Failure, title, message });
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
    setErrorCode(null);
    setResult(null);
    setPendingWord(null);

    try {
      const geminiResult = await translateText(text, geminiApiKey, languagePair, controller.signal, {
        model,
        reasoningLevel,
      });

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

      const { code, title, message } = describeError(err);
      setErrorCode(code);
      setError(message);

      await showToast({ style: Toast.Style.Failure, title, message });
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
      isLoading={isLoading || langResult.isLoading}
      isShowingDetail={
        (showResult && isTextResult) || showSensePicker || (showEmpty && showRecent && recentShowingDetail)
      }
      searchBarPlaceholder={`Type a ${source.name} word or text...`}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarAccessory={
        <LanguagePairDropdown pair={activePair} defaultPair={activeDefaultPair} onChange={handleLanguagePairChange} />
      }
    >
      {error ? (
        <List.EmptyView
          title={errorCode === "network-offline" ? "No Internet Connection" : "Translation Error"}
          description={error}
          icon={errorCode === "network-offline" ? Icon.WifiDisabled : Icon.ExclamationMark}
          actions={
            <ActionPanel>
              {(errorCode === "invalid-api-key" || errorCode === "model-not-found") && (
                <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              )}
              {RETRYABLE_ERROR_CODES.has(errorCode ?? "") && searchText.trim() && (
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => submitTranslation(searchText)} />
              )}
              <ToggleLanguagesAction onAction={handleToggleLanguages} />
            </ActionPanel>
          }
        />
      ) : showSensePicker && pendingWord ? (
        <List.Section title="Choose Translation">
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
                title={`${index + 1}. ${sense.translation}`}
                accessories={[
                  ...(index === 0 && pendingWord.effectiveWord !== pendingWord.originalInput
                    ? [{ tag: { value: `corrected → "${pendingWord.effectiveWord}"`, color: Color.Orange } }]
                    : []),
                  { tag: { value: sense.partOfSpeech, color: posColor(sense.partOfSpeech) } },
                ]}
                detail={<TranslationDetail item={detailTranslation} originalInput={pendingWord.originalInput} />}
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
                    <PronounceAction
                      word={pendingWord.effectiveWord}
                      languageCode={languagePair.source.code}
                      title="Pronounce Word"
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <PronounceAction
                      word={sense.translation}
                      languageCode={languagePair.target.code}
                      title="Pronounce Translation"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                    <Action
                      title="Open History"
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                      onAction={() => push(<History languagePair={languagePair} />)}
                    />
                    <ToggleLanguagesAction onAction={handleToggleLanguages} />
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
            detail={<TranslationDetail item={result} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={result.translation}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <PronounceAction
                  word={result.word}
                  languageCode={languagePair.source.code}
                  title="Pronounce Original"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <PronounceAction
                  word={result.translation}
                  languageCode={languagePair.target.code}
                  title="Pronounce Translation"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
                <Action
                  title="Open History"
                  icon={Icon.Clock}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  onAction={() => push(<History languagePair={languagePair} />)}
                />
                <ToggleLanguagesAction onAction={handleToggleLanguages} />
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
                <ToggleLanguagesAction onAction={handleToggleLanguages} />
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
                  <ToggleLanguagesAction onAction={handleToggleLanguages} />
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
                  detail={<TranslationDetail item={item} />}
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
                      <PronounceAction
                        word={item.word}
                        languageCode={languagePair.source.code}
                        title="Pronounce Word"
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <PronounceAction
                        word={item.translation}
                        languageCode={languagePair.target.code}
                        title="Pronounce Translation"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      />
                      <Action
                        title="Open History"
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={() => push(<History languagePair={languagePair} />)}
                      />
                      <ToggleLanguagesAction onAction={handleToggleLanguages} />
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
