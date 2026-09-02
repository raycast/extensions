/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { myPreferences } from "@/consts";
import { playQueryWordAudio } from "@/core/audio";
import { detectLanguage } from "@/core/detect";
import type { DetectedLangModel } from "@/core/detect/types";
import { englishLanguageItem } from "@/core/language/consts";
import type { LanguageItem } from "@/core/language/types";
import { getLanguageItem } from "@/core/language/utils";
import { computeDisplaySections } from "@/core/query/displaySections";
import { computeHideDisplay } from "@/core/query/hideRules";
import type { QueryAction, QueryState } from "@/core/query/queryReducer";
import { queryReducer } from "@/core/query/queryReducer";
import { getAutoSelectedTargetLanguageItem } from "@/core/query/utils";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import { builtinDictionaryProviderServices, builtinTranslationServices } from "@/providers/registry";
import type { TranslationServiceConfig } from "@/providers/translation";
import { TranslationType } from "@/types/api";
import type { DisplaySection, ListDisplayItem } from "@/types/display";
import type {
  DictionaryQueryResult,
  QueryInput,
  RuntimeServiceConfig,
  RuntimeServiceMetadata,
  TranslationQueryResult,
  TranslationResult,
} from "@/types/query";
import { RequestError, showErrorToast } from "@/utils/errors";
import { logTrace, logWarn } from "@/utils/logger";

logTrace("UseQueryEngine", "module loaded");

interface QuerySession {
  generation: number;
  signal: AbortSignal;
}

function createRuntimeServiceMetadata(service: RuntimeServiceConfig): RuntimeServiceMetadata {
  return {
    serviceId: service.id,
    serviceLabel: service.label,
    serviceOrder: service.order,
    serviceIcon: service.icon,
  };
}

export interface QueryServiceSnapshot {
  translationServices: TranslationServiceConfig[];
  dictionaryServices: DictionaryServiceConfig[];
}

const defaultQueryServiceSnapshot: QueryServiceSnapshot = {
  translationServices: builtinTranslationServices,
  dictionaryServices: builtinDictionaryProviderServices,
};

// Initial State

function createInitialState({
  initialFromLanguage,
  initialTargetLanguage,
}: {
  initialFromLanguage: LanguageItem;
  initialTargetLanguage: LanguageItem;
}): QueryState {
  return {
    activeGeneration: 0,
    listEpoch: 0,
    queryResults: [],
    queryRecordList: [],
    isLoading: false,
    isShowDetail: false,
    currentFromLanguageItem: initialFromLanguage,
    autoSelectedTargetLanguageItem: initialTargetLanguage,
  };
}

// Hook

function createStreamDebouncer(
  service: TranslationServiceConfig,
  queryWordInfo: QueryInput,
  dispatch: React.Dispatch<QueryAction>,
  buildTranslationDisplay: (
    rawResult: TranslationResult,
    service: TranslationServiceConfig,
  ) => TranslationQueryResult | null,
  generation: number,
  delay = 80,
) {
  let updateTimer: ReturnType<typeof setTimeout> | undefined;
  let accumulatedText = "";

  const flushUpdate = () => {
    if (accumulatedText) {
      const result: TranslationResult = {
        type: service.type,
        queryWordInfo,
        translations: [accumulatedText],
        result: { translatedText: accumulatedText },
      };
      const displayResult = buildTranslationDisplay(result, service);
      if (displayResult) {
        dispatch({ type: "SET_RESULT", queryResult: displayResult, generation });
      }
    }
  };

  return {
    push(text: string) {
      accumulatedText += text;
      if (!updateTimer) {
        updateTimer = setTimeout(() => {
          updateTimer = undefined;
          flushUpdate();
        }, delay);
      }
    },
    clear(flush = true) {
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = undefined;
      }
      if (flush) {
        flushUpdate();
      }
    },
  };
}

export function useQueryEngine(
  initialFromLanguage: LanguageItem,
  initialTargetLanguage: LanguageItem,
  serviceSnapshot: QueryServiceSnapshot = defaultQueryServiceSnapshot,
) {
  const [state, dispatch] = useReducer(
    queryReducer,
    { initialFromLanguage, initialTargetLanguage },
    createInitialState,
  );

  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const isCurrentQueryRef = useRef(true);
  const hasPlayedAudioRef = useRef(false);
  const generationRef = useRef(0);
  const isEffectMountedRef = useRef(false);
  const currentQueryWordInfoRef = useRef<QueryInput | undefined>(undefined);
  const serviceSnapshotRef = useRef(serviceSnapshot);
  serviceSnapshotRef.current = serviceSnapshot;
  const previousServiceSnapshotRef = useRef(serviceSnapshot);

  const beginQuerySession = useCallback((): QuerySession => {
    generationRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    isCurrentQueryRef.current = true;
    hasPlayedAudioRef.current = false;
    currentQueryWordInfoRef.current = undefined;
    const session = {
      generation: generationRef.current,
      signal: abortControllerRef.current.signal,
    };
    dispatch({ type: "RESET_FOR_NEW_QUERY", generation: session.generation });
    return session;
  }, []);

  const displaySections = useMemo(() => computeDisplaySections(state), [state]);

  useEffect(() => {
    isEffectMountedRef.current = true;
    return () => {
      isEffectMountedRef.current = false;
      queueMicrotask(() => {
        if (!isEffectMountedRef.current) {
          abortControllerRef.current?.abort();
        }
      });
    };
  }, []);

  const buildTranslationDisplay = useCallback(
    (queryResult: TranslationResult, service: TranslationServiceConfig): TranslationQueryResult | null => {
      const { type, translations, queryWordInfo } = queryResult;

      const oneLineTranslation = translations.join(", ");
      if (!oneLineTranslation.trim()) {
        logWarn("UseQueryEngine", `${service.label} result is empty.`);
        return null;
      }

      const copyText = translations.join("\n");
      const isStreamingProvider = type === TranslationType.OpenAI || type === TranslationType.Gemini;

      const displayItem: ListDisplayItem = {
        queryType: type,
        key: isStreamingProvider ? service.id : `${service.id}:${oneLineTranslation}`,
        title: oneLineTranslation,
        copyText,
        queryWordInfo,
      };
      const displaySections: DisplaySection[] = [{ type, sectionTitle: service.label, items: [displayItem] }];

      return {
        ...queryResult,
        ...createRuntimeServiceMetadata(service),
        displaySections,
        hideDisplay: computeHideDisplay(type),
      };
    },
    [],
  );

  const runTranslationQuery = useCallback(
    async (config: TranslationServiceConfig, queryWordInfo: QueryInput, session: QuerySession) => {
      if (!config.enabled(queryWordInfo)) return;

      dispatch({ type: "START_QUERY", serviceId: config.id, generation: session.generation });

      const instance = config.createProvider();
      let debouncer: ReturnType<typeof createStreamDebouncer> | undefined;

      try {
        const iterator = instance.request(queryWordInfo, { signal: session.signal });
        debouncer = createStreamDebouncer(config, queryWordInfo, dispatch, buildTranslationDisplay, session.generation);
        let finalResult: TranslationResult | undefined;

        while (true) {
          const { done, value } = await iterator.next();
          if (done) {
            finalResult = value;
            break;
          }
          debouncer.push(value.content);
        }

        if (finalResult) {
          const displayResult = buildTranslationDisplay(finalResult, config);
          if (displayResult) {
            dispatch({ type: "SET_RESULT", queryResult: displayResult, generation: session.generation });
          }
        }

        debouncer.clear();
      } catch (error) {
        debouncer?.clear(false);
        showErrorToast(
          error instanceof RequestError ? new RequestError(config.label, error.message, error.code) : error,
        );
      } finally {
        dispatch({ type: "FINISH_QUERY", serviceId: config.id, generation: session.generation });
      }
    },
    [buildTranslationDisplay],
  );

  const runDictionaryQuery = useCallback(
    async (config: DictionaryServiceConfig, queryWordInfo: QueryInput, session: QuerySession) => {
      if (!config.enabled(queryWordInfo)) return;

      dispatch({ type: "START_QUERY", serviceId: config.id, generation: session.generation });
      const instance = config.createProvider();

      try {
        const result = await instance.request(queryWordInfo, { signal: session.signal });
        const displaySections = result.displaySections;
        if (displaySections?.length) {
          const queryResult: DictionaryQueryResult = {
            ...result,
            ...createRuntimeServiceMetadata(config),
            displaySections,
          };
          dispatch({ type: "SET_RESULT", queryResult, generation: session.generation });

          const wordInfo = queryResult.queryWordInfo;
          const shouldAutoPlay =
            myPreferences.enableAutomaticPlayWordAudio &&
            wordInfo.isWord &&
            wordInfo.fromLanguage === englishLanguageItem.youdaoLangCode &&
            session.generation === generationRef.current &&
            !session.signal.aborted &&
            isCurrentQueryRef.current &&
            !hasPlayedAudioRef.current &&
            config.canTriggerAutomaticAudio;

          if (shouldAutoPlay) {
            hasPlayedAudioRef.current = true;
            logTrace("UseQueryEngine", `playing audio for: ${wordInfo.word}`);
            playQueryWordAudio(wordInfo, { signal: session.signal }).catch((error) => {
              if (!session.signal.aborted) {
                logWarn("UseQueryEngine", `failed to play audio for ${wordInfo.word}: ${error}`);
              }
            });
          }
        }
      } catch (error) {
        showErrorToast(
          error instanceof RequestError ? new RequestError(config.label, error.message, error.code) : error,
        );
      } finally {
        dispatch({ type: "FINISH_QUERY", serviceId: config.id, generation: session.generation });
      }
    },
    [],
  );

  const runAllProviders = useCallback(
    (queryWordInfo: QueryInput, session: QuerySession) => {
      for (const config of serviceSnapshotRef.current.dictionaryServices) {
        runDictionaryQuery(config, queryWordInfo, session);
      }

      for (const config of serviceSnapshotRef.current.translationServices) {
        runTranslationQuery(config, queryWordInfo, session);
      }

      // If all providers were disabled, no START_QUERY was dispatched.
      // This will ensure we don't get stuck in a loading state.
      dispatch({ type: "CHECK_PENDING_QUERIES", generation: session.generation });
    },
    [runDictionaryQuery, runTranslationQuery],
  );

  const queryTextWithTextInfo = useCallback(
    (queryWordInfo: QueryInput) => {
      const session = beginQuerySession();
      currentQueryWordInfoRef.current = queryWordInfo;

      const { word, fromLanguage, toLanguage } = queryWordInfo;
      logTrace("UseQueryEngine", `query text: ${word}`);
      logTrace("UseQueryEngine", `query fromTo: ${fromLanguage} -> ${toLanguage}`);

      runAllProviders(queryWordInfo, session);
    },
    [beginQuerySession, runAllProviders],
  );

  const queryTextWithDetectedLanguage = useCallback(
    (text: string, toLanguage: string, detectedLanguage: DetectedLangModel, session: QuerySession) => {
      const fromYoudaoLangCode = detectedLanguage.youdaoLangCode;
      logTrace("UseQueryEngine", `queryTextWithFromLanguageId: ${fromYoudaoLangCode}`);

      const fromLanguageItem = getLanguageItem(fromYoudaoLangCode);

      let targetLangCode = toLanguage;
      logTrace("UseQueryEngine", `userSelectedTargetLanguage: ${targetLangCode}`);

      let targetLanguageItem: LanguageItem;
      if (fromYoudaoLangCode === targetLangCode) {
        targetLanguageItem = getAutoSelectedTargetLanguageItem(fromYoudaoLangCode);
        targetLangCode = targetLanguageItem.youdaoLangCode;
        logTrace("UseQueryEngine", `conflict, use autoSelectedTargetLanguage: ${targetLangCode}`);
      } else {
        targetLanguageItem = getLanguageItem(targetLangCode);
      }

      dispatch({
        type: "SET_DETECTED_LANGUAGE",
        fromLanguageItem,
        targetLanguageItem,
        generation: session.generation,
      });

      const queryTextInfo: QueryInput = {
        word: text,
        fromLanguage: fromYoudaoLangCode,
        toLanguage: targetLangCode,
      };
      currentQueryWordInfoRef.current = queryTextInfo;
      runAllProviders(queryTextInfo, session);
    },
    [runAllProviders],
  );

  const queryText = useCallback(
    (text: string, toLanguage: string) => {
      logTrace("UseQueryEngine", `query: ${text}`);

      const session = beginQuerySession();

      detectLanguage(text, session.signal)
        .then((detectedLanguage: DetectedLangModel) => {
          logTrace(
            "UseQueryEngine",
            `final confirmed: ${detectedLanguage.confirmed}, type: ${detectedLanguage.type}, detectLanguage: ${detectedLanguage.youdaoLangCode}`,
          );

          if (session.signal.aborted || session.generation !== generationRef.current) {
            logTrace("UseQueryEngine", "query has been cancelled, stop, return");
            return;
          }

          queryTextWithDetectedLanguage(text, toLanguage, detectedLanguage, session);
        })
        .catch((error) => {
          if (session.signal.aborted) {
            logTrace("UseQueryEngine", "language detection cancelled");
            return;
          }
          showErrorToast(error);
        });
    },
    [beginQuerySession, queryTextWithDetectedLanguage],
  );

  useEffect(() => {
    // Only newly added service IDs join an active query. Existing IDs keep
    // their in-flight request; profile edits apply on the next query.
    const previousSnapshot = previousServiceSnapshotRef.current;
    previousServiceSnapshotRef.current = serviceSnapshot;
    if (previousSnapshot === serviceSnapshot) return;
    const queryWordInfo = currentQueryWordInfoRef.current;
    const signal = abortControllerRef.current?.signal;
    if (!queryWordInfo || !signal || signal.aborted) return;

    const previousTranslationServiceIds = new Set(previousSnapshot.translationServices.map((service) => service.id));
    const addedTranslationServices = serviceSnapshot.translationServices.filter(
      (service) => !previousTranslationServiceIds.has(service.id),
    );
    const previousDictionaryServiceIds = new Set(previousSnapshot.dictionaryServices.map((service) => service.id));
    const addedDictionaryServices = serviceSnapshot.dictionaryServices.filter(
      (service) => !previousDictionaryServiceIds.has(service.id),
    );
    if (addedTranslationServices.length === 0 && addedDictionaryServices.length === 0) return;

    const session = { generation: generationRef.current, signal };
    for (const service of addedDictionaryServices) {
      runDictionaryQuery(service, queryWordInfo, session);
    }
    for (const service of addedTranslationServices) {
      runTranslationQuery(service, queryWordInfo, session);
    }
  }, [runDictionaryQuery, runTranslationQuery, serviceSnapshot]);

  const clearQueryResult = useCallback(() => {
    currentQueryWordInfoRef.current = undefined;
    const activeController = abortControllerRef.current;
    if (activeController) {
      logTrace("UseQueryEngine", "clearQueryResult");
      activeController.abort();
    }

    generationRef.current += 1;
    isCurrentQueryRef.current = false;

    abortControllerRef.current = undefined;

    dispatch({ type: "CLEAR_ALL", generation: generationRef.current });
  }, []);

  const setAutoSelectedTargetLanguageItem = useCallback((item: LanguageItem) => {
    dispatch({ type: "SET_TARGET_LANGUAGE", targetLanguageItem: item });
  }, []);

  return {
    displaySections,
    queryGeneration: state.activeGeneration,
    listEpoch: state.listEpoch,
    isLoading: state.isLoading,
    isShowDetail: state.isShowDetail,
    currentFromLanguageItem: state.currentFromLanguageItem,
    autoSelectedTargetLanguageItem: state.autoSelectedTargetLanguageItem,

    queryText,
    queryTextWithTextInfo,
    clearQueryResult,
    setAutoSelectedTargetLanguageItem,
  } as const;
}
