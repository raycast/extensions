import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableAnalysisProviders,
  PROVIDER_LABELS,
  resolveAnalysisConfig,
  resolveAnalysisModel,
  type ProviderName,
} from "./llm/config";
import { ANALYSIS_MODELS, PROVIDER_IDS } from "./llm/models";
import {
  resolveTranslationTarget,
  translateText,
  type ExpressionTone,
  type TranslationPromptMode,
} from "./llm/translate";
import { AnalyzeView } from "./AnalyzeView";
import { getPrefs } from "./lib/preferences";
import {
  readTranslationCache,
  translationCacheKey,
  writeTranslationCache,
} from "./lib/translation-cache";
import { reportError } from "./lib/errors";
import { renderTranslationMarkdown } from "./render/translation";
import {
  applyAnalysisModel,
  initialAnalysisModels,
  initialAnalysisProvider,
  readRuntimeSelection,
  writeRuntimeSelection,
  type AnalysisModelMap,
  type RuntimeSelection,
} from "./lib/runtime-selection";

interface TranslationState {
  translation?: string;
  coaching?: string;
  targetLanguageTitle?: string;
  isLoading?: boolean;
  failed?: boolean;
  errorMessage?: string;
}

const EXPRESSION_TONES: ExpressionTone[] = [
  "natural",
  "casual",
  "formal",
  "concise",
];

const EXPRESSION_TONE_LABELS: Record<ExpressionTone, string> = {
  natural: "Natural",
  casual: "Casual",
  formal: "Formal",
  concise: "Concise",
};

export function TranslateView({
  text,
  mode = "translate",
  title,
  sourceTitle,
  preferredLanguage,
}: {
  text: string;
  mode?: TranslationPromptMode;
  title?: string;
  sourceTitle?: string;
  preferredLanguage?: string;
}) {
  const prefs = useMemo(() => getPrefs(), []);
  const [storedSelection, setStoredSelection] =
    useState<RuntimeSelection | null>(null);

  useEffect(() => {
    let mounted = true;
    void readRuntimeSelection().then((selection) => {
      if (mounted) setStoredSelection(selection);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (storedSelection === null) {
    return <Detail isLoading={true} markdown="# Translating…" />;
  }

  return (
    <TranslateViewInner
      text={text}
      mode={mode}
      title={title}
      sourceTitle={sourceTitle}
      preferredLanguage={preferredLanguage}
      prefs={prefs}
      storedSelection={storedSelection}
    />
  );
}

function TranslateViewInner({
  text,
  mode,
  title,
  sourceTitle,
  preferredLanguage,
  prefs,
  storedSelection,
}: {
  text: string;
  mode: TranslationPromptMode;
  title?: string;
  sourceTitle?: string;
  preferredLanguage?: string;
  prefs: Preferences;
  storedSelection: RuntimeSelection;
}) {
  const source = text.trim();
  const [provider, setProvider] = useState<ProviderName>(
    initialAnalysisProvider(prefs, storedSelection),
  );
  const [analysisModels, setAnalysisModels] = useState<AnalysisModelMap>(() =>
    initialAnalysisModels(prefs, storedSelection),
  );
  const [expressionTone, setExpressionTone] =
    useState<ExpressionTone>("natural");
  const [state, setState] = useState<TranslationState>({ isLoading: true });
  const generationRef = useRef(0);

  const availableProviders = useMemo<ProviderName[]>(() => {
    const list = getAvailableAnalysisProviders(prefs);
    return list.length > 0 ? list : [...PROVIDER_IDS];
  }, [prefs]);
  const activePrefs = useMemo(
    () =>
      applyAnalysisModel(
        prefs,
        provider,
        analysisModels[provider] ?? resolveAnalysisModel(provider, prefs),
      ),
    [analysisModels, prefs, provider],
  );
  const analysisModel = resolveAnalysisModel(provider, activePrefs);
  const persistSelection = useCallback(
    (next: {
      analysisProvider?: ProviderName;
      analysisModels?: AnalysisModelMap;
    }) => {
      writeRuntimeSelection({
        ...storedSelection,
        analysisProvider: provider,
        analysisModels,
        ...next,
      });
    },
    [analysisModels, provider, storedSelection],
  );

  const runTranslation = useCallback(
    async (forceFresh = false) => {
      const generation = ++generationRef.current;
      if (!source) {
        setState({
          isLoading: false,
          failed: true,
          errorMessage: "No source text was provided.",
        });
        return;
      }

      const model = resolveAnalysisModel(provider, activePrefs);
      const target = resolveTranslationTarget(
        preferredLanguage ?? prefs.translationTargetLanguage,
        source,
      );
      const key = translationCacheKey({
        text: source,
        provider,
        model,
        targetLanguage: target.language,
        promptMode:
          mode === "express-intent" ? `${mode}:${expressionTone}` : undefined,
      });

      setState((previous) => ({
        ...(forceFresh
          ? {
              translation: previous.translation,
              coaching: previous.coaching,
            }
          : {}),
        isLoading: true,
        failed: false,
        targetLanguageTitle: target.title,
        errorMessage: undefined,
      }));

      const cached = forceFresh ? null : readTranslationCache(key);
      if (cached) {
        if (generation === generationRef.current) {
          setState({
            ...cached,
            isLoading: false,
            failed: false,
            errorMessage: undefined,
          });
        }
        return;
      }

      try {
        const cfg = resolveAnalysisConfig(provider, activePrefs);
        const result = await translateText(source, cfg, {
          preferredLanguage: target.language,
          mode,
          expressionTone:
            mode === "express-intent" ? expressionTone : undefined,
        });
        writeTranslationCache(key, result);
        if (generation === generationRef.current) {
          setState({
            ...result,
            isLoading: false,
            failed: false,
            errorMessage: undefined,
          });
        }
      } catch (err) {
        if (generation === generationRef.current) {
          setState((previous) => ({
            ...(forceFresh
              ? {
                  translation: previous.translation,
                  coaching: previous.coaching,
                }
              : {}),
            isLoading: false,
            failed: true,
            targetLanguageTitle: target.title,
            errorMessage: formatTranslationError(err),
          }));
        }
        await reportError(err);
      }
    },
    [
      activePrefs,
      expressionTone,
      mode,
      preferredLanguage,
      prefs.translationTargetLanguage,
      provider,
      source,
    ],
  );

  useEffect(() => {
    void runTranslation();
  }, [runTranslation]);

  const selectProvider = useCallback(
    (next: ProviderName) => {
      setProvider(next);
      setState({ isLoading: true });
      persistSelection({ analysisProvider: next });
    },
    [persistSelection],
  );

  const selectAnalysisModel = useCallback(
    (model: string) => {
      const nextModels = { ...analysisModels, [provider]: model };
      setAnalysisModels(nextModels);
      setState({ isLoading: true });
      persistSelection({ analysisModels: nextModels });
    },
    [analysisModels, persistSelection, provider],
  );

  const selectExpressionTone = useCallback((tone: ExpressionTone) => {
    setExpressionTone(tone);
    setState({ isLoading: true });
  }, []);

  const onSwitchProvider = useCallback(() => {
    const i = availableProviders.indexOf(provider);
    const next = availableProviders[(i + 1) % availableProviders.length];
    selectProvider(next);
  }, [availableProviders, provider, selectProvider]);

  const nextProvider =
    availableProviders.length > 1
      ? availableProviders[
          (availableProviders.indexOf(provider) + 1) % availableProviders.length
        ]
      : undefined;

  const markdown = renderTranslationMarkdown(source, state, {
    title:
      title ?? (mode === "express-intent" ? "Expression Coach" : "Translation"),
    sourceTitle:
      sourceTitle ?? (mode === "express-intent" ? "Intent" : "Source"),
    emptyLabel:
      mode === "express-intent"
        ? "Could not express this intent. Use Refresh Expression to try again."
        : undefined,
  });

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={mode === "express-intent" ? "Coach Provider" : "Provider"}
            text={PROVIDER_LABELS[provider]}
          />
          <Detail.Metadata.Label
            title={mode === "express-intent" ? "Coach Model" : "Model"}
            text={analysisModel}
          />
          <Detail.Metadata.Label
            title={mode === "express-intent" ? "Output" : "Target"}
            text={state.targetLanguageTitle ?? "Auto"}
          />
          {mode === "express-intent" ? (
            <Detail.Metadata.Label
              title="Tone"
              text={EXPRESSION_TONE_LABELS[expressionTone]}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section
            title={
              mode === "express-intent" ? "Expression Coach" : "Translation"
            }
          >
            <Action.CopyToClipboard
              title={
                mode === "express-intent"
                  ? "Copy Expression"
                  : "Copy Translation"
              }
              content={state.translation ?? ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Source"
              content={source}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title={
                mode === "express-intent"
                  ? "Refresh Expression"
                  : "Refresh Translation"
              }
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => void runTranslation(true)}
            />
            {mode === "express-intent" && state.translation ? (
              <Action.Push
                title="Practice This English"
                icon={Icon.Microphone}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={<AnalyzeView text={state.translation} />}
              />
            ) : null}
            {mode === "express-intent" ? (
              <ActionPanel.Submenu
                title={`Tone: ${EXPRESSION_TONE_LABELS[expressionTone]}`}
                icon={Icon.Text}
              >
                {EXPRESSION_TONES.map((tone) => (
                  <Action
                    key={tone}
                    title={EXPRESSION_TONE_LABELS[tone]}
                    icon={
                      tone === expressionTone ? Icon.CheckCircle : Icon.Circle
                    }
                    onAction={() => selectExpressionTone(tone)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section
            title={
              mode === "express-intent"
                ? "Coach Provider & Model"
                : "Provider & Model"
            }
          >
            <ActionPanel.Submenu
              title={
                mode === "express-intent"
                  ? "Choose Coach Provider"
                  : "Choose Translation Provider"
              }
              icon={Icon.Switch}
            >
              {availableProviders.map((value) => (
                <Action
                  key={value}
                  title={PROVIDER_LABELS[value]}
                  icon={value === provider ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => selectProvider(value)}
                />
              ))}
            </ActionPanel.Submenu>
            {ANALYSIS_MODELS[provider].length > 1 ? (
              <ActionPanel.Submenu
                title={
                  mode === "express-intent"
                    ? "Choose Coach Model"
                    : "Choose Translation Model"
                }
                icon={Icon.Text}
              >
                {ANALYSIS_MODELS[provider].map((option) => (
                  <Action
                    key={option.id}
                    title={option.title}
                    icon={
                      option.id === analysisModel
                        ? Icon.CheckCircle
                        : Icon.Circle
                    }
                    onAction={() => selectAnalysisModel(option.id)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            {nextProvider ? (
              <Action
                title={`Switch Provider to ${PROVIDER_LABELS[nextProvider]}`}
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={onSwitchProvider}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function formatTranslationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted key]")
    .replace(/sk-[0-9A-Za-z_-]{12,}/g, "[redacted key]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}
