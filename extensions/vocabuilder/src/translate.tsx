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
import { translateWord, translateText } from "./lib/translation";
import { defaultToastFor } from "./lib/errorToast";
import { reportUnexpectedError } from "./lib/errorReporting";
import { providerError, isProviderError } from "./lib/providerError";
import { resolveProviderConfig, selectedProvider, type ProviderPreferences } from "./lib/providers";
import { looksLikeWordAttempt, normalizeWordInput, normalizeTextInput } from "./lib/input";
import { storageKeyPrefix } from "./lib/languages";
import { languagePairTitle, languagePairValue, swapLanguagePair } from "./lib/languageSession";
import { posColor } from "./lib/colors";
import { SHORTCUTS } from "./lib/shortcuts";
import { TranslationDetail } from "./components/TranslationDetail";
import { translationFromSense } from "./lib/sense";
import { getHistory, saveTranslation } from "./lib/storage";
import { Translation, WordSense } from "./lib/types";
import { CachedWordLookup, createWordLookupCache, decideWordLookup, WordLookupScope } from "./lib/wordLookupCache";

function pickSenseShortcut(index: number): { modifiers: "cmd"[]; key: "1" | "2" | "3" | "4" | "5" } | undefined {
  if (index < 0 || index > 4) return undefined;
  const keys: ("1" | "2" | "3" | "4" | "5")[] = ["1", "2", "3", "4", "5"];
  return { modifiers: ["cmd"], key: keys[index] };
}

// Codes that surface a Retry button. See AGENTS.md → Error Handling (Retry policy).
// Wider than isTransient: empty-response and invalid-response are NOT auto-retried
// (the provider already responded, just badly) but a human-triggered retry is still worth
// offering since the next call may produce a usable response.
const RETRYABLE_ERROR_CODES = new Set<string>([
  "network-offline",
  "request-failed",
  "empty-response",
  "invalid-response",
]);

// Codes whose fix is a preferences change, so the error view offers Open Preferences.
const PREFERENCES_ERROR_CODES = new Set<string>([
  "invalid-api-key",
  "model-not-found",
  "invalid-base-url",
  "provider-undetected",
  "missing-model",
]);

const SECRET_PREFIX_RE = /^(sk-|ghp_|github_pat_|xox[baprs]-|AKIA|ASIA|AIza)/i;
const WORD_TRANSLATION_DEBOUNCE_MS = 700;

function scheduleWordTranslation(callback: () => void): ReturnType<typeof setTimeout> {
  return setTimeout(callback, WORD_TRANSLATION_DEBOUNCE_MS);
}

const LOADING_TICK_MS = 200;

const LOADING_ICON_FRAMES: Icon[] = [
  Icon.CircleProgress25,
  Icon.CircleProgress50,
  Icon.CircleProgress75,
  Icon.CircleProgress100,
];

function loadingIcon(tick: number): Icon {
  return LOADING_ICON_FRAMES[tick % LOADING_ICON_FRAMES.length];
}

function useLoadingTick(active: boolean): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), LOADING_TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  return tick;
}

function shouldShowRecent(hasRecent: boolean, isEmptyInput: boolean, isLoading: boolean): boolean {
  return hasRecent && (isEmptyInput || isLoading);
}

function isSafeClipboardSuggestion(raw: string): boolean {
  const text = raw.trim();
  if (!text || text.includes("\n")) return false;
  if (SECRET_PREFIX_RE.test(text)) return false;
  return normalizeWordInput(text) !== null;
}

// Built from the selected provider rather than the resolved config: the scope is
// needed on every keystroke, before a lookup resolves (and possibly rejects) the config.
function wordLookupScope(pairPrefix: string, prefs: ProviderPreferences): WordLookupScope {
  return {
    pairPrefix,
    provider: selectedProvider(prefs) ?? "unknown",
    model: prefs.translationModel?.trim() ?? "",
  };
}

type ErrorDescription = { code: string; title: string; message: string };

// UNKNOWN_ERROR is the catch-all for AbortError and genuinely unexpected throws;
// everything recognized routes through defaultToastFor.
function describeError(err: unknown): ErrorDescription {
  if (isProviderError(err)) {
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
    <Action title="Toggle Languages" icon={Icon.Switch} shortcut={SHORTCUTS.toggleLanguages} onAction={onAction} />
  );
}

export default function Translate() {
  const providerPrefs = getPreferenceValues<Preferences.Translate>();
  const { readClipboardOnOpen } = providerPrefs;
  const langResult = useLanguagePair();
  const { push } = useNavigation();

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<Translation[]>([]);
  const [pendingWord, setPendingWord] = useState<CachedWordLookup | null>(null);
  const [clipboardSuggestion, setClipboardSuggestion] = useState("");
  const [recentShowingDetail, setRecentShowingDetail] = useState(false);

  const loadingTick = useLoadingTick(isLoading);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordLookupCacheRef = useRef(createWordLookupCache());

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
  const lookupScope = wordLookupScope(storageKeyPrefix(activePair), providerPrefs);

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
    wordLookupCacheRef.current.clear();
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
      const desc = describeError(
        providerError({ domain: "outcome", kind: "invalid-word-input", surface: "translate" }),
      );
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
    const desc = describeError(providerError({ domain: "outcome", kind: "invalid-text-input", surface: "translate" }));
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

    const decision = decideWordLookup(text, wordLookupCacheRef.current, lookupScope);
    if (decision.kind === "hit") {
      setIsLoading(false);
      setPendingWord(decision.cached);
      return;
    }

    setPendingWord(null);
    setIsLoading(false);

    if (decision.kind === "miss") {
      debounceRef.current = scheduleWordTranslation(() => {
        debounceRef.current = null;
        submitTranslation(text, false);
      });
    }
  }

  async function commitWordSense(pw: CachedWordLookup, sense: WordSense) {
    if (!languagePair) return;
    const now = Date.now();
    const translation = translationFromSense(pw.effectiveWord, sense, `${pw.effectiveWord}-${now}`, now);

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
    if (!languagePair) return;
    const cacheWord = normalizeWordInput(word) ?? word;
    const cached = wordLookupCacheRef.current.get({ ...lookupScope, word: cacheWord });
    if (cached) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setIsLoading(false);
      setError(null);
      setErrorCode(null);
      setResult(null);
      setPendingWord(cached);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setResult(null);
    setPendingWord(null);

    try {
      const wordResult = await translateWord(
        word,
        resolveProviderConfig(providerPrefs),
        languagePair,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      const corrected = wordResult.correctedWord;
      const effectiveWord = corrected && corrected !== word ? corrected : word;
      const pending: CachedWordLookup = {
        effectiveWord,
        originalInput: word,
        senses: wordResult.senses,
      };

      wordLookupCacheRef.current.set({ ...lookupScope, word: cacheWord }, pending);
      setPendingWord(pending);
    } catch (err) {
      if (controller.signal.aborted) return;

      reportUnexpectedError(err);
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
      const textResult = await translateText(
        text,
        resolveProviderConfig(providerPrefs),
        languagePair,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      const translation: Translation = {
        id: `text-${Date.now()}`,
        word: text,
        translation: textResult.translation,
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

      reportUnexpectedError(err);
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
  const showRecent = shouldShowRecent(recentHistory.length > 0, showEmpty, isLoading);
  const showResult = !!result && !isLoading;
  const isTextResult = result?.type === "text";
  const isWordInput = normalizeWordInput(searchText) !== null;
  const showSensePicker = !!pendingWord && !isLoading;
  const showManualSubmitItem = !showEmpty && !error && !showResult && !isLoading && !showSensePicker;
  const showLoadingRow = isLoading && !showEmpty;

  return (
    <List
      navigationTitle={`${languagePair.source.name} → ${languagePair.target.name}`}
      isLoading={isLoading || langResult.isLoading}
      isShowingDetail={(showResult && isTextResult) || showSensePicker || (showRecent && recentShowingDetail)}
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
              {PREFERENCES_ERROR_CODES.has(errorCode ?? "") && (
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
            const detailTranslation = translationFromSense(
              pendingWord.effectiveWord,
              sense,
              `pick-${index}`,
              Date.now(),
            );
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
                detail={
                  <TranslationDetail
                    item={detailTranslation}
                    languagePair={languagePair}
                    originalInput={pendingWord.originalInput}
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
                      shortcut={SHORTCUTS.copyTranslation}
                    />
                    <PronounceAction
                      word={pendingWord.effectiveWord}
                      languageCode={languagePair.source.code}
                      title="Pronounce Word"
                      shortcut={SHORTCUTS.pronounceWord}
                    />
                    <PronounceAction
                      word={sense.translation}
                      languageCode={languagePair.target.code}
                      title="Pronounce Translation"
                      shortcut={SHORTCUTS.pronounceTranslation}
                    />
                    <Action
                      title="Open History"
                      icon={Icon.Clock}
                      shortcut={SHORTCUTS.openHistory}
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
            detail={<TranslationDetail item={result} languagePair={languagePair} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Translation"
                  content={result.translation}
                  shortcut={SHORTCUTS.copyTranslation}
                />
                <PronounceAction
                  word={result.word}
                  languageCode={languagePair.source.code}
                  title="Pronounce Original"
                  shortcut={SHORTCUTS.pronounceWord}
                />
                <PronounceAction
                  word={result.translation}
                  languageCode={languagePair.target.code}
                  title="Pronounce Translation"
                  shortcut={SHORTCUTS.pronounceTranslation}
                />
                <Action
                  title="Open History"
                  icon={Icon.Clock}
                  shortcut={SHORTCUTS.openHistory}
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
              isWordInput ? "Press Enter to translate immediately (auto-runs in 0.7s)" : "Press Enter to translate"
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
      ) : showLoadingRow ? (
        <List.Section title="Translation">
          <List.Item
            title={`Translating "${truncate(searchText.trim(), 40)}"…`}
            icon={{ source: loadingIcon(loadingTick), tintColor: Color.SecondaryText }}
          />
        </List.Section>
      ) : showEmpty ? (
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
      ) : null}
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
              detail={<TranslationDetail item={item} languagePair={languagePair} />}
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
                    shortcut={SHORTCUTS.copyTranslation}
                  />
                  <PronounceAction
                    word={item.word}
                    languageCode={languagePair.source.code}
                    title="Pronounce Word"
                    shortcut={SHORTCUTS.pronounceWord}
                  />
                  <PronounceAction
                    word={item.translation}
                    languageCode={languagePair.target.code}
                    title="Pronounce Translation"
                    shortcut={SHORTCUTS.pronounceTranslation}
                  />
                  <Action
                    title="Open History"
                    icon={Icon.Clock}
                    shortcut={SHORTCUTS.openHistory}
                    onAction={() => push(<History languagePair={languagePair} />)}
                  />
                  <ToggleLanguagesAction onAction={handleToggleLanguages} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

if (import.meta.vitest) {
  const { afterEach, describe, expect, it, vi } = import.meta.vitest;

  describe("word translation debounce", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("waits 700 ms before automatically translating a word", () => {
      vi.useFakeTimers();
      const translate = vi.fn();

      scheduleWordTranslation(translate);

      vi.advanceTimersByTime(699);
      expect(translate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(translate).toHaveBeenCalledTimes(1);
    });
  });

  describe("wordLookupScope", () => {
    const prefs: ProviderPreferences = { provider: "auto", apiKey: "AIzaSyTest", translationModel: "" };

    it("separates lookups made through different providers, including ones Auto detects from the key", () => {
      const gemini = wordLookupScope("en-uk", prefs);
      expect(gemini.provider).toBe("gemini");
      expect(wordLookupScope("en-uk", { ...prefs, apiKey: "sk-ant-api03-abc" }).provider).toBe("anthropic");
      expect(wordLookupScope("en-uk", { ...prefs, provider: "openai-compatible" }).provider).toBe("openai-compatible");
    });

    it("separates a custom model from the provider default without throwing on an unrecognized key", () => {
      expect(wordLookupScope("en-uk", { ...prefs, translationModel: " gemini-3-pro " }).model).toBe("gemini-3-pro");
      expect(wordLookupScope("en-uk", { ...prefs, apiKey: "ollama" })).toEqual({
        pairPrefix: "en-uk",
        provider: "unknown",
        model: "",
      });
    });
  });

  describe("recent visibility", () => {
    it("keeps Recent mounted while a translation is in flight", () => {
      expect(shouldShowRecent(true, false, true)).toBe(true);
    });

    it("hides Recent once input is typed and nothing is loading", () => {
      expect(shouldShowRecent(true, false, false)).toBe(false);
    });

    it("never shows an empty Recent section", () => {
      expect(shouldShowRecent(false, true, false)).toBe(false);
      expect(shouldShowRecent(false, false, true)).toBe(false);
    });
  });

  describe("loading icon", () => {
    it("advances on every tick so the row reads as motion", () => {
      const frames = [0, 1, 2, 3].map(loadingIcon);
      expect(new Set(frames).size).toBe(frames.length);
    });

    it("cycles instead of running off the end of the frame list", () => {
      expect(loadingIcon(LOADING_ICON_FRAMES.length)).toBe(loadingIcon(0));
      expect(loadingIcon(LOADING_ICON_FRAMES.length * 7 + 2)).toBe(loadingIcon(2));
    });

    it("never shows the hollow 0% ring, which reads as an empty checkbox", () => {
      expect(LOADING_ICON_FRAMES).not.toContain(Icon.CircleProgress);
    });
  });
}
