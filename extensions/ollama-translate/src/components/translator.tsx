import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AUTO_LANGUAGE,
  LANGUAGES,
  detectLanguageLocally,
  getLanguage,
  normalizeLanguageCode,
} from "../lib/languages";
import {
  OllamaModel,
  listLocalModels,
  normalizeOllamaUrl,
  refineWithOllama,
  translateWithOllama,
} from "../lib/ollama";

type Preferences = {
  ollamaUrl: string;
  defaultModel?: string;
  autoTranslate: boolean;
  debounceDelay: string;
  keepAlive: string;
};

type TranslatorProps = {
  initialText?: string;
  initialTextLoading?: boolean;
};

type TranslationEntry = {
  id: string;
  sourceText: string;
  translation: string;
  detectedLanguage: string;
  targetLanguage: string;
  model: string;
  createdAt: number;
};

const STORAGE_KEYS = {
  history: "translation-history",
  model: "selected-model",
  sourceLanguage: "source-language",
  targetLanguage: "target-language",
} as const;

const MAX_HISTORY_ITEMS = 50;
const CURRENT_TRANSLATION_ID = "current-translation";

export function Translator({
  initialText = "",
  initialTextLoading = false,
}: TranslatorProps) {
  const preferences = getPreferenceValues<Preferences>();
  const [text, setText] = useState(initialText);
  const [translation, setTranslation] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE.code);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    initialText.trim() ? CURRENT_TRANSLATION_ID : undefined,
  );
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model, setModel] = useState("");
  const [history, setHistory] = useState<TranslationEntry[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialTextAppliedRef = useRef(Boolean(initialText));
  const lastStartedFingerprintRef = useRef("");

  const ollamaUrl = useMemo(() => {
    try {
      return normalizeOllamaUrl(preferences.ollamaUrl);
    } catch {
      return preferences.ollamaUrl;
    }
  }, [preferences.ollamaUrl]);

  const persistHistory = useCallback((entries: TranslationEntry[]) => {
    void LocalStorage.setItem(STORAGE_KEYS.history, JSON.stringify(entries));
  }, []);

  const saveHistoryEntry = useCallback(
    (entry: TranslationEntry) => {
      setHistory((previous) => {
        const next = [
          entry,
          ...previous.filter((item) => item.id !== entry.id),
        ].slice(0, MAX_HISTORY_ITEMS);
        persistHistory(next);
        return next;
      });
    },
    [persistHistory],
  );

  const deleteHistoryEntry = useCallback(
    (id: string) => {
      setHistory((previous) => {
        const next = previous.filter((item) => item.id !== id);
        persistHistory(next);
        return next;
      });
    },
    [persistHistory],
  );

  useEffect(() => {
    void LocalStorage.getItem<string>(STORAGE_KEYS.history)
      .then((storedHistory) => setHistory(parseHistory(storedHistory)))
      .finally(() => setIsLoadingHistory(false));
  }, []);

  const loadModels = useCallback(
    async (showSuccess = false) => {
      setIsLoadingModels(true);
      setError("");

      try {
        const [localModels, savedModel, savedSource, savedTarget] =
          await Promise.all([
            listLocalModels(ollamaUrl),
            LocalStorage.getItem<string>(STORAGE_KEYS.model),
            LocalStorage.getItem<string>(STORAGE_KEYS.sourceLanguage),
            LocalStorage.getItem<string>(STORAGE_KEYS.targetLanguage),
          ]);

        setModels(localModels);
        if (
          savedSource &&
          (savedSource === AUTO_LANGUAGE.code ||
            LANGUAGES.some((language) => language.code === savedSource))
        ) {
          setSourceLanguage(savedSource);
          setDetectedLanguage(
            savedSource === AUTO_LANGUAGE.code ? "" : savedSource,
          );
        }
        if (
          savedTarget &&
          LANGUAGES.some((language) => language.code === savedTarget)
        ) {
          setTargetLanguage(savedTarget);
        }

        const preferredModel = preferences.defaultModel?.trim();
        const nextModel =
          [savedModel, preferredModel].find((candidate) =>
            localModels.some((localModel) => localModel.name === candidate),
          ) ??
          localModels[0]?.name ??
          "";

        setModel(nextModel);
        if (showSuccess) {
          await showToast({
            style: Toast.Style.Success,
            title: "Local models refreshed",
            message: `${localModels.length} model${localModels.length === 1 ? "" : "s"} available`,
          });
        }
      } catch (loadError) {
        setModels([]);
        setModel("");
        setError(formatError(loadError));
      } finally {
        setIsLoadingModels(false);
      }
    },
    [ollamaUrl, preferences.defaultModel],
  );

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (!initialText || initialTextAppliedRef.current) return;
    initialTextAppliedRef.current = true;
    setText(initialText);
    setSelectedItemId(CURRENT_TRANSLATION_ID);
  }, [initialText]);

  const requestFingerprint = useMemo(
    () => JSON.stringify([text, sourceLanguage, targetLanguage, model]),
    [model, sourceLanguage, targetLanguage, text],
  );

  const runTranslation = useCallback(
    async ({
      force = false,
      notify = false,
    }: { force?: boolean; notify?: boolean } = {}) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        setTranslation("");
        setDetectedLanguage(
          sourceLanguage === AUTO_LANGUAGE.code ? "" : sourceLanguage,
        );
        setError("");
        return;
      }

      if (!model) {
        setError("No local Ollama model is available.");
        return;
      }

      if (!force && lastStartedFingerprintRef.current === requestFingerprint)
        return;
      lastStartedFingerprintRef.current = requestFingerprint;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsTranslating(true);
      setError("");

      try {
        const result = await translateWithOllama({
          baseUrl: ollamaUrl,
          model,
          text: trimmedText,
          sourceLanguage,
          targetLanguage,
          keepAlive: preferences.keepAlive,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        const normalizedDetectedLanguage = normalizeLanguageCode(
          result.detectedLanguageCode,
        );
        setTranslation(result.translation);
        setDetectedLanguage(normalizedDetectedLanguage);
        saveHistoryEntry({
          id: createEntryId(trimmedText, targetLanguage),
          sourceText: trimmedText,
          translation: result.translation,
          detectedLanguage: normalizedDetectedLanguage,
          targetLanguage,
          model,
          createdAt: Date.now(),
        });

        if (notify) {
          await showToast({
            style: Toast.Style.Success,
            title: "Translation ready",
            message: `Translated locally with ${model}`,
          });
        }
      } catch (translationError) {
        if (isAbortError(translationError)) return;
        lastStartedFingerprintRef.current = "";
        const message = formatError(translationError);
        setError(message);
        if (notify) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Translation failed",
            message,
          });
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsTranslating(false);
        }
      }
    },
    [
      model,
      ollamaUrl,
      preferences.keepAlive,
      requestFingerprint,
      saveHistoryEntry,
      sourceLanguage,
      targetLanguage,
      text,
    ],
  );

  useEffect(() => {
    abortControllerRef.current?.abort();
  }, [requestFingerprint]);

  useEffect(() => {
    if (
      !preferences.autoTranslate ||
      !text.trim() ||
      !model ||
      initialTextLoading
    )
      return;

    const timeout = setTimeout(
      () => void runTranslation(),
      Number(preferences.debounceDelay) || 700,
    );

    return () => clearTimeout(timeout);
  }, [
    initialTextLoading,
    model,
    preferences.autoTranslate,
    preferences.debounceDelay,
    runTranslation,
    text,
  ]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const refineTranslation = useCallback(async () => {
    if (!translation.trim() || !text.trim() || !model) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRefining(true);
    setError("");

    try {
      const result = await refineWithOllama({
        baseUrl: ollamaUrl,
        model,
        text: text.trim(),
        candidate: translation,
        sourceLanguage,
        targetLanguage,
        keepAlive: preferences.keepAlive,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      const normalizedDetectedLanguage = normalizeLanguageCode(
        result.detectedLanguageCode || detectedLanguage,
      );
      setTranslation(result.translation);
      setDetectedLanguage(normalizedDetectedLanguage);
      saveHistoryEntry({
        id: createEntryId(text.trim(), targetLanguage),
        sourceText: text.trim(),
        translation: result.translation,
        detectedLanguage: normalizedDetectedLanguage,
        targetLanguage,
        model,
        createdAt: Date.now(),
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Meaning double-checked",
        message: `Reviewed locally with ${model}`,
      });
    } catch (refinementError) {
      if (isAbortError(refinementError)) return;
      const message = formatError(refinementError);
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Review failed",
        message,
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsRefining(false);
      }
    }
  }, [
    detectedLanguage,
    model,
    ollamaUrl,
    preferences.keepAlive,
    saveHistoryEntry,
    sourceLanguage,
    targetLanguage,
    text,
    translation,
  ]);

  const handleSearchTextChange = useCallback(
    (value: string) => {
      lastStartedFingerprintRef.current = "";
      setText(value);
      setTranslation("");
      setDetectedLanguage(
        sourceLanguage === AUTO_LANGUAGE.code ? "" : sourceLanguage,
      );
      setSelectedItemId(value.trim() ? CURRENT_TRANSLATION_ID : undefined);
      setError("");
    },
    [sourceLanguage],
  );

  const handleSourceLanguageChange = useCallback((value: string) => {
    lastStartedFingerprintRef.current = "";
    setSourceLanguage(value);
    setTranslation("");
    setDetectedLanguage(value === AUTO_LANGUAGE.code ? "" : value);
    setSelectedItemId((current) =>
      current ? CURRENT_TRANSLATION_ID : current,
    );
    setError("");
    void LocalStorage.setItem(STORAGE_KEYS.sourceLanguage, value);
  }, []);

  const handleTargetLanguageChange = useCallback(
    (value: string) => {
      lastStartedFingerprintRef.current = "";
      setTargetLanguage(value);
      setTranslation("");
      setDetectedLanguage((current) =>
        sourceLanguage === AUTO_LANGUAGE.code ? "" : current || sourceLanguage,
      );
      setSelectedItemId((current) =>
        current ? CURRENT_TRANSLATION_ID : current,
      );
      setError("");
      void LocalStorage.setItem(STORAGE_KEYS.targetLanguage, value);
    },
    [sourceLanguage],
  );

  const selectModel = useCallback(
    (value: string) => {
      lastStartedFingerprintRef.current = "";
      setModel(value);
      setTranslation("");
      setDetectedLanguage(
        sourceLanguage === AUTO_LANGUAGE.code ? "" : sourceLanguage,
      );
      setSelectedItemId((current) =>
        current ? CURRENT_TRANSLATION_ID : current,
      );
      setError("");
      void LocalStorage.setItem(STORAGE_KEYS.model, value);
    },
    [sourceLanguage],
  );

  const useHistoryEntry = useCallback((entry: TranslationEntry) => {
    const historySource = LANGUAGES.some(
      (language) => language.code === entry.detectedLanguage,
    )
      ? entry.detectedLanguage
      : AUTO_LANGUAGE.code;
    setText(entry.sourceText);
    setTranslation(entry.translation);
    setDetectedLanguage(entry.detectedLanguage);
    setSourceLanguage(historySource);
    setTargetLanguage(entry.targetLanguage);
    setSelectedItemId(CURRENT_TRANSLATION_ID);
    void LocalStorage.setItem(STORAGE_KEYS.sourceLanguage, historySource);
    void LocalStorage.setItem(
      STORAGE_KEYS.targetLanguage,
      entry.targetLanguage,
    );
  }, []);

  const swapLanguages = useCallback(async () => {
    const sourceForSwap = normalizeLanguageCode(detectedLanguage);
    if (
      !translation ||
      !LANGUAGES.some((language) => language.code === sourceForSwap)
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Source language is not known yet",
        message: "Translate once before swapping languages.",
      });
      return;
    }

    const previousText = text;
    const previousTarget = targetLanguage;
    setText(translation);
    setTranslation(previousText);
    setDetectedLanguage(previousTarget);
    setSourceLanguage(previousTarget);
    setTargetLanguage(sourceForSwap);
    setSelectedItemId(CURRENT_TRANSLATION_ID);
    void LocalStorage.setItem(STORAGE_KEYS.sourceLanguage, previousTarget);
    void LocalStorage.setItem(STORAGE_KEYS.targetLanguage, sourceForSwap);
  }, [detectedLanguage, targetLanguage, text, translation]);

  const pasteClipboard = useCallback(async () => {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard does not contain text",
      });
      return;
    }
    handleSearchTextChange(clipboardText);
  }, [handleSearchTextChange]);

  const clearSearch = useCallback(
    () => handleSearchTextChange(""),
    [handleSearchTextChange],
  );

  const currentEntry = useMemo<TranslationEntry | null>(() => {
    if (!text.trim()) return null;
    return {
      id: CURRENT_TRANSLATION_ID,
      sourceText: text.trim(),
      translation,
      detectedLanguage,
      targetLanguage,
      model,
      createdAt: Date.now(),
    };
  }, [detectedLanguage, model, targetLanguage, text, translation]);

  const currentHistoryId = text.trim()
    ? createEntryId(text.trim(), targetLanguage)
    : "";
  const visibleHistory = history.filter(
    (entry) => entry.id !== currentHistoryId,
  );
  const isLoading =
    isLoadingModels ||
    isLoadingHistory ||
    isTranslating ||
    isRefining ||
    initialTextLoading;

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      searchText={text}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Type or paste text to translate…"
      searchBarAccessory={
        <LanguagePairDropdown
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onSourceChange={handleSourceLanguageChange}
          onTargetChange={handleTargetLanguageChange}
        />
      }
      actions={
        <EmptyActions
          models={models}
          model={model}
          onSelectModel={selectModel}
          onPaste={pasteClipboard}
          onReloadModels={loadModels}
        />
      }
    >
      {currentEntry ? (
        <List.Section title="Translation">
          <TranslationListItem
            entry={currentEntry}
            isCurrent
            error={error}
            isLoading={isTranslating || isRefining}
            models={models}
            selectedModel={model}
            onClear={clearSearch}
            onDeleteHistory={deleteHistoryEntry}
            onPaste={pasteClipboard}
            onRefine={refineTranslation}
            onReloadModels={loadModels}
            onSelectModel={selectModel}
            onSwap={swapLanguages}
            onTranslate={runTranslation}
            onUseEntry={useHistoryEntry}
          />
        </List.Section>
      ) : null}

      {visibleHistory.length ? (
        <List.Section title="History" subtitle={`${visibleHistory.length}`}>
          {visibleHistory.map((entry) => (
            <TranslationListItem
              key={entry.id}
              entry={entry}
              isCurrent={false}
              error=""
              isLoading={false}
              models={models}
              selectedModel={model}
              onClear={clearSearch}
              onDeleteHistory={deleteHistoryEntry}
              onPaste={pasteClipboard}
              onRefine={refineTranslation}
              onReloadModels={loadModels}
              onSelectModel={selectModel}
              onSwap={swapLanguages}
              onTranslate={runTranslation}
              onUseEntry={useHistoryEntry}
            />
          ))}
        </List.Section>
      ) : null}

      {!currentEntry && !visibleHistory.length ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.TextInput}
          title={error ? "Ollama is unavailable" : "Start typing to translate"}
          description={
            error ||
            "Your translation will appear on the right and stay in history on the left."
          }
        />
      ) : null}
    </List>
  );
}

function LanguagePairDropdown({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
}: {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
}) {
  const sourceTitle = getLanguage(sourceLanguage)?.title ?? "Detect Language";
  const targetTitle = getLanguage(targetLanguage)?.title ?? targetLanguage;
  const pairValue = `pair:${sourceLanguage}:${targetLanguage}`;

  return (
    <List.Dropdown
      tooltip={`From ${sourceTitle} to ${targetTitle}`}
      value={pairValue}
      filtering
      onChange={(value) => {
        if (value.startsWith("from:")) {
          onSourceChange(value.slice("from:".length));
        } else if (value.startsWith("to:")) {
          onTargetChange(value.slice("to:".length));
        }
      }}
      placeholder="Choose From or To language…"
    >
      <List.Dropdown.Item
        value={pairValue}
        title={`${sourceTitle} → ${targetTitle}`}
        icon={Icon.Switch}
      />
      <List.Dropdown.Section title={`From — ${sourceTitle}`}>
        {[AUTO_LANGUAGE, ...LANGUAGES].map((language) => (
          <List.Dropdown.Item
            key={`from:${language.code}`}
            value={`from:${language.code}`}
            title={language.title}
            keywords={[language.nativeName, language.code, "from", "source"]}
            icon={
              language.code === sourceLanguage
                ? Icon.CheckCircle
                : Icon.ArrowLeft
            }
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title={`To — ${targetTitle}`}>
        {LANGUAGES.map((language) => (
          <List.Dropdown.Item
            key={`to:${language.code}`}
            value={`to:${language.code}`}
            title={language.title}
            keywords={[language.nativeName, language.code, "to", "target"]}
            icon={
              language.code === targetLanguage
                ? Icon.CheckCircle
                : Icon.ArrowRight
            }
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

type TranslationListItemProps = {
  entry: TranslationEntry;
  isCurrent: boolean;
  error: string;
  isLoading: boolean;
  models: OllamaModel[];
  selectedModel: string;
  onClear: () => void;
  onDeleteHistory: (id: string) => void;
  onPaste: () => Promise<void>;
  onRefine: () => Promise<void>;
  onReloadModels: (showSuccess?: boolean) => Promise<void>;
  onSelectModel: (model: string) => void;
  onSwap: () => Promise<void>;
  onTranslate: (options?: {
    force?: boolean;
    notify?: boolean;
  }) => Promise<void>;
  onUseEntry: (entry: TranslationEntry) => void;
};

function TranslationListItem({
  entry,
  isCurrent,
  error,
  isLoading,
  models,
  selectedModel,
  onClear,
  onDeleteHistory,
  onPaste,
  onRefine,
  onReloadModels,
  onSelectModel,
  onSwap,
  onTranslate,
  onUseEntry,
}: TranslationListItemProps) {
  const sourceLanguage =
    getLanguage(entry.detectedLanguage)?.title ?? "Detected language";
  const targetLanguage =
    getLanguage(entry.targetLanguage)?.title ??
    entry.targetLanguage.toUpperCase();
  const subtitle = isCurrent
    ? error
      ? "Translation failed"
      : isLoading
        ? "Translating locally…"
        : entry.translation
          ? `${sourceLanguage} → ${targetLanguage}`
          : "Press Enter to translate now"
    : `${sourceLanguage} → ${targetLanguage}`;

  const detailMarkdown = error
    ? `## Translation unavailable\n\n${escapeMarkdown(error)}`
    : entry.translation ||
      (isLoading
        ? "Preparing a natural translation…"
        : "Press **Enter** to translate this text.");

  return (
    <List.Item
      id={entry.id}
      icon={Icon.SpeechBubble}
      title={{ value: oneLine(entry.sourceText), tooltip: entry.sourceText }}
      subtitle={subtitle}
      keywords={[entry.translation, sourceLanguage, targetLanguage]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={detailMarkdown}
          metadata={
            entry.translation ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Languages"
                  text={`${sourceLanguage} → ${targetLanguage}`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Model"
                  text={entry.model}
                  icon={Icon.HardDrive}
                />
                <List.Item.Detail.Metadata.Label
                  title="Privacy"
                  text="Local only"
                  icon={Icon.Lock}
                />
              </List.Item.Detail.Metadata>
            ) : null
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {entry.translation ? (
              <Action.CopyToClipboard
                title="Copy Translation"
                content={entry.translation}
              />
            ) : (
              <Action
                title="Translate Now"
                icon={Icon.Wand}
                onAction={() => void onTranslate({ force: true, notify: true })}
              />
            )}
            {isCurrent && entry.translation ? (
              <Action
                title="Translate Again"
                icon={Icon.ArrowClockwise}
                onAction={() => void onTranslate({ force: true, notify: true })}
              />
            ) : null}
            {isCurrent && entry.translation ? (
              <Action
                title="Double-Check Meaning"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => void onRefine()}
              />
            ) : null}
            {!isCurrent ? (
              <Action
                title="Use as New Source"
                icon={Icon.TextInput}
                onAction={() => onUseEntry(entry)}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section title="Text">
            {entry.translation ? (
              <Action.CopyToClipboard
                title="Copy Source Text"
                content={entry.sourceText}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            {isCurrent && entry.translation ? (
              <Action
                title="Swap Languages"
                icon={Icon.Switch}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                onAction={() => void onSwap()}
              />
            ) : null}
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={() => void onPaste()}
            />
            {isCurrent ? (
              <Action
                title="Clear Search"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                onAction={onClear}
              />
            ) : (
              <Action
                title="Delete from History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => onDeleteHistory(entry.id)}
              />
            )}
          </ActionPanel.Section>

          <OllamaActions
            models={models}
            selectedModel={selectedModel}
            onReloadModels={onReloadModels}
            onSelectModel={onSelectModel}
          />
        </ActionPanel>
      }
    />
  );
}

function EmptyActions({
  models,
  model,
  onSelectModel,
  onPaste,
  onReloadModels,
}: {
  models: OllamaModel[];
  model: string;
  onSelectModel: (model: string) => void;
  onPaste: () => Promise<void>;
  onReloadModels: (showSuccess?: boolean) => Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action
        title="Paste Text to Translate"
        icon={Icon.Clipboard}
        onAction={() => void onPaste()}
      />
      <OllamaActions
        models={models}
        selectedModel={model}
        onReloadModels={onReloadModels}
        onSelectModel={onSelectModel}
      />
    </ActionPanel>
  );
}

function OllamaActions({
  models,
  selectedModel,
  onReloadModels,
  onSelectModel,
}: {
  models: OllamaModel[];
  selectedModel: string;
  onReloadModels: (showSuccess?: boolean) => Promise<void>;
  onSelectModel: (model: string) => void;
}) {
  return (
    <ActionPanel.Section title="Ollama">
      <Action.Push
        title="Choose Local Model…"
        icon={Icon.HardDrive}
        target={
          <ModelPicker
            models={models}
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
          />
        }
      />
      <Action
        title="Refresh Local Models"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void onReloadModels(true)}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={() => void openExtensionPreferences()}
      />
    </ActionPanel.Section>
  );
}

function ModelPicker({
  models,
  selectedModel,
  onSelectModel,
}: {
  models: OllamaModel[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
}) {
  const { pop } = useNavigation();

  return (
    <List
      navigationTitle="Choose Local Model"
      searchBarPlaceholder="Search local models…"
    >
      {models.map((model, index) => (
        <List.Item
          key={model.name}
          id={model.name}
          icon={Icon.HardDrive}
          title={model.name}
          subtitle={
            index === 0
              ? "Recommended for meaning"
              : model.details?.parameter_size
          }
          accessories={
            model.name === selectedModel
              ? [{ icon: Icon.CheckCircle, tooltip: "Current model" }]
              : undefined
          }
          actions={
            <ActionPanel>
              <Action
                title="Use This Model"
                icon={Icon.CheckCircle}
                onAction={() => {
                  onSelectModel(model.name);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!models.length ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No local model found"
          description="Start Ollama or install a model, then refresh the list."
        />
      ) : null}
    </List>
  );
}

function parseHistory(value: string | undefined): TranslationEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isTranslationEntry)
      .slice(0, MAX_HISTORY_ITEMS)
      .map((entry) => {
        if (entry.sourceText.trim().length > 48) return entry;
        const repairedLanguage = detectLanguageLocally(entry.sourceText);
        return repairedLanguage
          ? { ...entry, detectedLanguage: repairedLanguage }
          : entry;
      });
  } catch {
    return [];
  }
}

function isTranslationEntry(value: unknown): value is TranslationEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<TranslationEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.sourceText === "string" &&
    typeof entry.translation === "string" &&
    typeof entry.detectedLanguage === "string" &&
    typeof entry.targetLanguage === "string" &&
    typeof entry.model === "string" &&
    typeof entry.createdAt === "number"
  );
}

function createEntryId(text: string, targetLanguage: string): string {
  const value = `${targetLanguage}\u0000${text}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `translation-${(hash >>> 0).toString(16)}`;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!>]/g, "\\$&");
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function formatError(error: unknown): string {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "Cannot reach Ollama. Start it, then refresh local models.";
  }
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}
