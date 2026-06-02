import { showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ProsodyAnalysis } from "./types";
import {
  getAvailableAnalysisProviders,
  PROVIDER_LABELS,
  resolveAnalysisConfig,
  resolveAnalysisModel,
  type ProviderName,
  type TtsProviderName,
} from "./llm/config";
import type { ChatConfig } from "./llm/client";
import {
  ANALYSIS_MODELS,
  PROVIDER_IDS,
  TTS_MODELS,
  TTS_PROVIDER_IDS,
  TTS_VOICES,
} from "./llm/models";
import { analyze } from "./llm/analyze";
import { resolveTranslationTarget, translateText } from "./llm/translate";
import type { PromptOptions } from "./llm/prompt";
import { isSingleWord } from "./lib/detect";
import { analysisCacheKey } from "./lib/cache-key";
import {
  readTranslationCache,
  translationCacheKey,
  writeTranslationCache,
} from "./lib/translation-cache";
import { saveResult } from "./lib/saved-results";
import { openReferenceCard } from "./lib/reference-card";
import { splitSentences, resolveSentencesPerPage } from "./lib/sentences";
import { resolveLoop } from "./lib/loop";
import { getPrefs } from "./lib/preferences";
import { reportError } from "./lib/errors";
import { readAnalysisCache, writeAnalysisCache } from "./lib/cache";
import {
  applyAnalysisModel,
  applyTtsSelection,
  defaultTtsVoice,
  initialAnalysisModels,
  initialAnalysisProvider,
  initialTtsModels,
  initialTtsProviderChoice,
  initialTtsVoices,
  readRuntimeSelection,
  writeRuntimeSelection,
  type AnalysisModelMap,
  type RuntimeSelection,
  type TtsModelMap,
  type TtsProviderChoice,
  type TtsVoiceMap,
} from "./lib/runtime-selection";
import {
  AnalysisDetail,
  AnalysisPlaceholder,
} from "./components/AnalysisDetail";
import { getAvailableTtsProviders, resolveTtsProvider } from "./tts/index";
import { speak, speakLoop, exportAudio, repeatLast } from "./tts/speak";
import { renderAnalysis } from "./render/markdown";

interface AnalysisRecord {
  analysis?: ProsodyAnalysis;
  isLoading?: boolean;
  failed?: boolean;
}

type AnalysisRecords = Record<number, AnalysisRecord | undefined>;

interface TranslationRecord {
  translation?: string;
  targetLanguage?: string;
  targetLanguageTitle?: string;
  isLoading?: boolean;
  failed?: boolean;
}

type TranslationRecords = Record<number, TranslationRecord | undefined>;

export function AnalyzeView({ text }: { text: string }) {
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
    return <AnalysisPlaceholder isLoading={true} />;
  }

  return (
    <AnalyzeViewInner
      text={text}
      prefs={prefs}
      storedSelection={storedSelection}
    />
  );
}

function AnalyzeViewInner({
  text,
  prefs,
  storedSelection,
}: {
  text: string;
  prefs: Preferences;
  storedSelection: RuntimeSelection;
}) {
  const sentences = useMemo(() => {
    const s = splitSentences(text);
    return s.length > 0 ? s : [text.trim()];
  }, [text]);
  const pageSize = useMemo(
    () => resolveSentencesPerPage(prefs.sentencesPerPage),
    [prefs.sentencesPerPage],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageStart, setPageStart] = useState(0);
  const [provider, setProvider] = useState<ProviderName>(
    initialAnalysisProvider(prefs, storedSelection),
  );
  const [analysisModels, setAnalysisModels] = useState<AnalysisModelMap>(() =>
    initialAnalysisModels(prefs, storedSelection),
  );
  const [ttsProviderChoice, setTtsProviderChoice] = useState<TtsProviderChoice>(
    () => initialTtsProviderChoice(prefs, storedSelection),
  );
  const [ttsModels, setTtsModels] = useState<TtsModelMap>(() =>
    initialTtsModels(prefs, storedSelection),
  );
  const [ttsVoices, setTtsVoices] = useState<TtsVoiceMap>(() =>
    initialTtsVoices(prefs, storedSelection),
  );
  const [records, setRecords] = useState<AnalysisRecords>({});
  const [translations, setTranslations] = useState<TranslationRecords>({});
  const genRef = useRef(0);
  const translationGenRef = useRef(0);

  const current = sentences[Math.min(activeIndex, sentences.length - 1)];
  const pageEnd = Math.min(pageStart + pageSize, sentences.length);
  const pageIndexes = useMemo(() => {
    const indexes: number[] = [];
    for (let i = pageStart; i < pageEnd; i++) indexes.push(i);
    return indexes;
  }, [pageEnd, pageStart]);

  // Providers the user has actually configured (a key is set). The switch
  // action cycles through these; falls back to the full catalog if none configured.
  const availableProviders = useMemo<ProviderName[]>(() => {
    const list = getAvailableAnalysisProviders(prefs);
    return list.length > 0 ? list : [...PROVIDER_IDS];
  }, [prefs]);
  const prefsForProvider = useCallback(
    (prov: ProviderName) => {
      const model = analysisModels[prov] ?? resolveAnalysisModel(prov, prefs);
      return applyTtsSelection(
        applyAnalysisModel(prefs, prov, model),
        ttsProviderChoice,
        ttsModels,
        ttsVoices,
      );
    },
    [analysisModels, prefs, ttsModels, ttsProviderChoice, ttsVoices],
  );
  const activePrefs = useMemo(
    () => prefsForProvider(provider),
    [prefsForProvider, provider],
  );
  const analysisModel = resolveAnalysisModel(provider, activePrefs);
  const ttsProvider = resolveTtsProvider(provider, activePrefs);
  const ttsModel =
    ttsModels[ttsProvider] ?? TTS_MODELS[ttsProvider][0]?.id ?? "";
  const ttsVoice =
    ttsVoices[ttsProvider] ?? defaultTtsVoice(ttsProvider, prefs);
  const availableTtsProviders = useMemo<TtsProviderName[]>(() => {
    const list = getAvailableTtsProviders(activePrefs);
    return list.length > 0 ? list : [...TTS_PROVIDER_IDS];
  }, [activePrefs]);

  const persistSelection = useCallback(
    (
      next: Partial<RuntimeSelection> & {
        analysisProvider?: ProviderName;
        analysisModels?: AnalysisModelMap;
        ttsProvider?: TtsProviderChoice;
        ttsModels?: TtsModelMap;
        ttsVoices?: TtsVoiceMap;
      },
    ) => {
      writeRuntimeSelection({
        analysisProvider: provider,
        analysisModels,
        ttsProvider: ttsProviderChoice,
        ttsModels,
        ttsVoices,
        ...next,
      });
    },
    [analysisModels, provider, ttsModels, ttsProviderChoice, ttsVoices],
  );

  const setRecord = useCallback((index: number, record: AnalysisRecord) => {
    setRecords((prev) => ({ ...prev, [index]: record }));
  }, []);

  const setTranslationRecord = useCallback(
    (index: number, record: TranslationRecord) => {
      setTranslations((prev) => ({ ...prev, [index]: record }));
    },
    [],
  );

  useEffect(() => {
    setPageStart((start) => Math.min(start, Math.max(sentences.length - 1, 0)));
    setActiveIndex((index) =>
      Math.min(index, Math.max(sentences.length - 1, 0)),
    );
  }, [sentences.length]);

  const analyzeOne = useCallback(
    async (index: number, cfg: ChatConfig, generation: number, key: string) => {
      const input = sentences[index];
      if (!input) return;

      try {
        const opts: PromptOptions = {
          isWord: isSingleWord(input),
          accent: "GA",
        };
        const result = await analyze(input, opts, cfg);
        writeAnalysisCache(key, result);
        if (generation === genRef.current) {
          setRecord(index, { analysis: result, isLoading: false });
        }
      } catch (err) {
        if (generation === genRef.current) {
          setRecord(index, { isLoading: false, failed: true });
        }
        await reportError(err);
      }
    },
    [sentences, setRecord],
  );

  const analyzeIndexes = useCallback(
    async (indexes: number[], prov: ProviderName, forceFresh = false) => {
      const generation = ++genRef.current;
      const scopedPrefs = prefsForProvider(prov);
      const model = resolveAnalysisModel(prov, scopedPrefs);
      const misses: { index: number; key: string }[] = [];

      for (const index of indexes) {
        const input = sentences[index];
        if (!input) continue;
        const key = analysisCacheKey(input, prov, "GA", model);
        setRecord(index, { isLoading: true, failed: false });
        const cached = forceFresh ? null : readAnalysisCache(key);
        if (cached) {
          if (generation === genRef.current) {
            setRecord(index, { analysis: cached, isLoading: false });
          }
        } else {
          misses.push({ index, key });
        }
      }

      if (misses.length === 0) return;

      let cfg: ChatConfig;
      try {
        cfg = resolveAnalysisConfig(prov, scopedPrefs);
      } catch (err) {
        misses.forEach(({ index }) =>
          setRecord(index, { isLoading: false, failed: true }),
        );
        await reportError(err);
        return;
      }

      for (const { index, key } of misses) {
        if (generation !== genRef.current) return;
        await analyzeOne(index, cfg, generation, key);
      }
    },
    [analyzeOne, prefsForProvider, sentences, setRecord],
  );

  useEffect(() => {
    void analyzeIndexes(pageIndexes, provider);
  }, [analyzeIndexes, pageIndexes, provider]);

  const translateIndexes = useCallback(
    async (indexes: number[], forceFresh = false) => {
      const generation = ++translationGenRef.current;
      const model = resolveAnalysisModel(provider, activePrefs);
      const misses: { index: number; key: string; targetLanguage: string }[] =
        [];

      for (const index of indexes) {
        const input = sentences[index];
        if (!input) continue;
        const target = resolveTranslationTarget(
          prefs.translationTargetLanguage,
          input,
        );
        const key = translationCacheKey({
          text: input,
          provider,
          model,
          targetLanguage: target.language,
        });
        setTranslationRecord(index, {
          isLoading: true,
          failed: false,
          targetLanguage: target.language,
          targetLanguageTitle: target.title,
        });
        const cached = forceFresh ? null : readTranslationCache(key);
        if (cached) {
          if (generation === translationGenRef.current) {
            setTranslationRecord(index, {
              ...cached,
              isLoading: false,
            });
          }
        } else {
          misses.push({ index, key, targetLanguage: target.language });
        }
      }

      if (misses.length === 0) return;

      let cfg: ChatConfig;
      try {
        cfg = resolveAnalysisConfig(provider, activePrefs);
      } catch (err) {
        misses.forEach(({ index }) =>
          setTranslationRecord(index, { isLoading: false, failed: true }),
        );
        await reportError(err);
        return;
      }

      for (const { index, key, targetLanguage } of misses) {
        if (generation !== translationGenRef.current) return;
        const input = sentences[index];
        if (!input) continue;
        try {
          const result = await translateText(input, cfg, targetLanguage);
          writeTranslationCache(key, result);
          if (generation === translationGenRef.current) {
            setTranslationRecord(index, {
              ...result,
              isLoading: false,
            });
          }
        } catch (err) {
          if (generation === translationGenRef.current) {
            setTranslationRecord(index, { isLoading: false, failed: true });
          }
          await reportError(err);
        }
      }
    },
    [
      activePrefs,
      prefs.translationTargetLanguage,
      provider,
      sentences,
      setTranslationRecord,
    ],
  );

  const speakAt = useCallback(
    (rate: number, label: string) => {
      void (async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: label,
        });
        try {
          await speak(current, provider, activePrefs, rate);
          toast.style = Toast.Style.Success;
          toast.title = "Played";
        } catch (err) {
          await reportError(err);
        }
      })();
    },
    [activePrefs, current, provider],
  );

  const onLoop = useCallback(() => {
    const { times, gapMs } = resolveLoop(prefs.loopCount, prefs.loopGap);
    void (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Shadowing ×${times}…`,
      });
      try {
        await speakLoop(current, provider, activePrefs, times, gapMs);
        toast.style = Toast.Style.Success;
        toast.title = "Done";
      } catch (err) {
        await reportError(err);
      }
    })();
  }, [activePrefs, current, provider, prefs.loopCount, prefs.loopGap]);

  const onRepeat = useCallback(() => {
    void repeatLast().then((ok) => {
      if (!ok)
        void showToast({
          style: Toast.Style.Failure,
          title: "Nothing to repeat yet",
        });
    });
  }, []);

  const onSave = useCallback(() => {
    void (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving audio…",
      });
      try {
        const dest = await exportAudio(current, provider, activePrefs);
        toast.style = Toast.Style.Success;
        toast.title = "Saved to Downloads";
        toast.message = dest;
      } catch (err) {
        await reportError(err);
      }
    })();
  }, [activePrefs, current, provider]);

  const onSaveResult = useCallback(() => {
    void (async () => {
      const analysis = records[activeIndex]?.analysis;
      if (!analysis) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Nothing to save yet",
        });
        return;
      }
      const translation = translations[activeIndex];
      const saved = await saveResult({
        kind: "analysis",
        sourceText: current,
        outputText: analysis.ipa,
        analysis,
        markdown: renderSavedAnalysisMarkdown(
          analysis,
          translation?.translation,
          translation?.targetLanguageTitle,
        ),
        provider,
        providerTitle: PROVIDER_LABELS[provider],
        model: analysisModel,
        targetLanguageTitle: translation?.targetLanguageTitle,
        ttsProvider,
        ttsProviderTitle: PROVIDER_LABELS[ttsProvider],
        ttsModel,
        ttsVoice,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Saved Result",
        message: saved.title,
      });
    })().catch((err) => void reportError(err));
  }, [
    activeIndex,
    analysisModel,
    current,
    provider,
    records,
    translations,
    ttsModel,
    ttsProvider,
    ttsVoice,
  ]);

  const onOpenReferenceWindow = useCallback(() => {
    void (async () => {
      const analysis = records[activeIndex]?.analysis;
      if (!analysis) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Nothing to open yet",
        });
        return;
      }
      const translation = translations[activeIndex];
      await openReferenceCard({
        title: "Pronunciation Reference",
        eyebrow: "Say It Right",
        sourceTitle: "Sentence",
        sourceText: current,
        outputTitle: "IPA",
        outputText: analysis.ipa,
        markdown: renderSavedAnalysisMarkdown(
          analysis,
          translation?.translation,
          translation?.targetLanguageTitle,
        ),
        metadata: [
          { title: "Analysis", text: PROVIDER_LABELS[provider] },
          { title: "Model", text: analysisModel },
          { title: "Voice", text: PROVIDER_LABELS[ttsProvider] },
          { title: "Voice Model", text: ttsModel },
          { title: "Voice Name", text: ttsVoice },
        ],
      });
    })().catch((err) => void reportError(err));
  }, [
    activeIndex,
    analysisModel,
    current,
    provider,
    records,
    translations,
    ttsModel,
    ttsProvider,
    ttsVoice,
  ]);

  const goToIndex = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(target, 0), sentences.length - 1);
      setActiveIndex(next);
      setPageStart(Math.floor(next / pageSize) * pageSize);
    },
    [pageSize, sentences.length],
  );

  const selectAnalysisProvider = useCallback(
    (next: ProviderName) => {
      setProvider(next);
      setRecords({});
      setTranslations({});
      setPageStart(0);
      setActiveIndex(0);
      persistSelection({ analysisProvider: next });
    },
    [persistSelection],
  );

  const onSwitchProvider = useCallback(() => {
    const i = availableProviders.indexOf(provider);
    const next = availableProviders[(i + 1) % availableProviders.length];
    selectAnalysisProvider(next);
  }, [availableProviders, provider, selectAnalysisProvider]);

  const selectAnalysisModel = useCallback(
    (model: string) => {
      const nextModels = { ...analysisModels, [provider]: model };
      setAnalysisModels(nextModels);
      setRecords({});
      setTranslations({});
      persistSelection({ analysisModels: nextModels });
    },
    [analysisModels, persistSelection, provider],
  );

  const selectTtsProvider = useCallback(
    (choice: TtsProviderChoice) => {
      setTtsProviderChoice(choice);
      persistSelection({ ttsProvider: choice });
    },
    [persistSelection],
  );

  const selectTtsModel = useCallback(
    (model: string) => {
      const nextModels = { ...ttsModels, [ttsProvider]: model };
      setTtsModels(nextModels);
      persistSelection({ ttsModels: nextModels });
    },
    [persistSelection, ttsModels, ttsProvider],
  );

  const selectTtsVoice = useCallback(
    (voice: string) => {
      const nextVoices = { ...ttsVoices, [ttsProvider]: voice };
      setTtsVoices(nextVoices);
      persistSelection({ ttsVoices: nextVoices });
    },
    [persistSelection, ttsProvider, ttsVoices],
  );

  const nextProvider =
    availableProviders.length > 1
      ? availableProviders[
          (availableProviders.indexOf(provider) + 1) % availableProviders.length
        ]
      : undefined;

  const onNewExample = useCallback(() => {
    void analyzeIndexes([activeIndex], provider, true);
  }, [activeIndex, analyzeIndexes, provider]);
  const onRetryCurrent = onNewExample;
  const onTranslateCurrent = useCallback(() => {
    void translateIndexes([activeIndex]);
  }, [activeIndex, translateIndexes]);
  const onTranslatePage = useCallback(() => {
    void translateIndexes(pageIndexes);
  }, [pageIndexes, translateIndexes]);

  const onNextSentence = useCallback(
    () => goToIndex(activeIndex + 1),
    [activeIndex, goToIndex],
  );
  const onPrevSentence = useCallback(
    () => goToIndex(activeIndex - 1),
    [activeIndex, goToIndex],
  );
  const onNextPage = useCallback(() => {
    const next = Math.min(pageStart + pageSize, sentences.length - 1);
    goToIndex(next);
  }, [goToIndex, pageSize, pageStart, sentences.length]);
  const onPrevPage = useCallback(() => {
    goToIndex(Math.max(pageStart - pageSize, 0));
  }, [goToIndex, pageSize, pageStart]);

  const items = useMemo(
    () =>
      pageIndexes.map((index) => ({
        index,
        text: sentences[index],
        analysis: records[index]?.analysis,
        isLoading: records[index]?.isLoading,
        failed: records[index]?.failed,
        translation: translations[index]?.translation,
        translationTarget: translations[index]?.targetLanguageTitle,
        translationLoading: translations[index]?.isLoading,
        translationFailed: translations[index]?.failed,
      })),
    [pageIndexes, records, sentences, translations],
  );

  if (sentences.length === 0 || !current) {
    return <AnalysisPlaceholder isLoading={false} failed />;
  }

  const anyLoading = items.some((item) => item.isLoading);
  const activeRecord = records[activeIndex];
  const activeTranslation = translations[activeIndex]?.translation;

  return (
    <AnalysisDetail
      items={items}
      provider={provider}
      isLoading={anyLoading}
      analysisModel={analysisModel}
      ttsProvider={ttsProvider}
      ttsFollowsAnalysis={ttsProviderChoice === "follow-analysis"}
      ttsModel={ttsModel}
      ttsVoice={ttsVoice}
      activeIndex={activeIndex}
      sentenceTotal={sentences.length}
      pageStart={pageStart}
      pageEnd={pageEnd}
      onPlay={() => speakAt(1, "Speaking…")}
      onSlow={() => speakAt(0.75, "Speaking slowly…")}
      onSlower={() => speakAt(0.5, "Speaking slower…")}
      onLoop={onLoop}
      onRepeat={onRepeat}
      onSave={onSave}
      onOpenReferenceWindow={onOpenReferenceWindow}
      onSaveResult={onSaveResult}
      onSwitchProvider={onSwitchProvider}
      switchToLabel={nextProvider ? PROVIDER_LABELS[nextProvider] : undefined}
      analysisProviderOptions={availableProviders.map((value) => ({
        value,
        title: PROVIDER_LABELS[value],
        selected: value === provider,
      }))}
      analysisModelOptions={ANALYSIS_MODELS[provider].map((option) => ({
        value: option.id,
        title: option.title,
        selected: option.id === analysisModel,
      }))}
      ttsProviderOptions={[
        {
          value: "follow-analysis",
          title: "Follow Analysis Provider",
          selected: ttsProviderChoice === "follow-analysis",
        },
        ...availableTtsProviders.map((value) => ({
          value,
          title: PROVIDER_LABELS[value],
          selected: ttsProviderChoice === value,
        })),
      ]}
      ttsModelOptions={TTS_MODELS[ttsProvider].map((option) => ({
        value: option.id,
        title: option.title,
        selected: option.id === ttsModel,
      }))}
      ttsVoiceOptions={TTS_VOICES[ttsProvider].map((option) => ({
        value: option.id,
        title: option.title,
        selected: option.id === ttsVoice,
      }))}
      onSelectAnalysisProvider={selectAnalysisProvider}
      onSelectAnalysisModel={selectAnalysisModel}
      onSelectTtsProvider={selectTtsProvider}
      onSelectTtsModel={selectTtsModel}
      onSelectTtsVoice={selectTtsVoice}
      onRetryCurrent={onRetryCurrent}
      onTranslateCurrent={onTranslateCurrent}
      onTranslatePage={onTranslatePage}
      activeTranslation={activeTranslation}
      onNewExample={
        activeRecord?.analysis?.isGeneratedExample ? onNewExample : undefined
      }
      onSelectSentence={goToIndex}
      onNextSentence={
        activeIndex < sentences.length - 1 ? onNextSentence : undefined
      }
      onPrevSentence={activeIndex > 0 ? onPrevSentence : undefined}
      onNextPage={pageEnd < sentences.length ? onNextPage : undefined}
      onPrevPage={pageStart > 0 ? onPrevPage : undefined}
    />
  );
}

function renderSavedAnalysisMarkdown(
  analysis: ProsodyAnalysis,
  translation?: string,
  targetLanguageTitle?: string,
): string {
  const lines = [
    "# Saved Analysis",
    "",
    renderAnalysis(analysis, { includeTitle: false }),
  ];
  if (translation) {
    lines.push("");
    lines.push("## Translation");
    lines.push("");
    if (targetLanguageTitle) {
      lines.push(`_${targetLanguageTitle}_`);
      lines.push("");
    }
    lines.push(`> ${translation}`);
  }
  return lines.join("\n");
}
