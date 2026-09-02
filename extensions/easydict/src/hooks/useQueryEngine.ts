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
import { dictionaryProviderServices } from "@/providers/dictionary";
import type { TranslationServiceConfig } from "@/providers/translation";
import { translationServices } from "@/providers/translation";
import { TranslationType } from "@/types/api";
import type { DisplaySection, ListDisplayItem } from "@/types/display";
import type { DictionaryQueryResult, QueryInput, TranslationQueryResult, TranslationResult } from "@/types/query";
import { showErrorToast } from "@/utils/errors";
import { logTrace, logWarn } from "@/utils/logger";

logTrace("UseQueryEngine", "module loaded");

interface QuerySession {
  generation: number;
  signal: AbortSignal;
}

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
  configType: TranslationType,
  queryWordInfo: QueryInput,
  dispatch: React.Dispatch<QueryAction>,
  buildTranslationDisplay: (rawResult: TranslationResult) => TranslationQueryResult | null,
  generation: number,
  delay = 80,
) {
  let updateTimer: ReturnType<typeof setTimeout> | undefined;
  let accumulatedText = "";

  const flushUpdate = () => {
    if (accumulatedText) {
      const result: TranslationResult = {
        type: configType,
        queryWordInfo,
        translations: [accumulatedText],
        result: { translatedText: accumulatedText },
      };
      const displayResult = buildTranslationDisplay(result);
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

export function useQueryEngine(initialFromLanguage: LanguageItem, initialTargetLanguage: LanguageItem) {
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

  const beginQuerySession = useCallback((): QuerySession => {
    generationRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    isCurrentQueryRef.current = true;
    hasPlayedAudioRef.current = false;
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

  const buildTranslationDisplay = useCallback((queryResult: TranslationResult): TranslationQueryResult | null => {
    const { type, translations, queryWordInfo } = queryResult;

    if (translations.length === 0) {
      logWarn("UseQueryEngine", `${type} result is empty.`);
      return null;
    }

    const oneLineTranslation = translations.join(", ");
    const copyText = translations.join("\n");
    const isStreamingProvider = type === TranslationType.OpenAI || type === TranslationType.Gemini;

    const displayItem: ListDisplayItem = {
      queryType: type,
      key: isStreamingProvider ? type : `${oneLineTranslation}-${type}`,
      title: oneLineTranslation,
      copyText,
      queryWordInfo,
    };
    const displaySections: DisplaySection[] = [{ type, sectionTitle: type, items: [displayItem] }];

    return {
      ...queryResult,
      displaySections,
      hideDisplay: computeHideDisplay(type),
    };
  }, []);

  const runTranslationQuery = useCallback(
    async (config: TranslationServiceConfig, queryWordInfo: QueryInput, session: QuerySession) => {
      const enabled = config.isEnabled?.(queryWordInfo) ?? myPreferences[config.preference];
      if (!enabled) return;

      dispatch({ type: "START_QUERY", queryType: config.type, generation: session.generation });

      const instance = new config.provider();
      let debouncer: ReturnType<typeof createStreamDebouncer> | undefined;

      try {
        const iterator = instance.request(queryWordInfo, { signal: session.signal });
        debouncer = createStreamDebouncer(
          config.type,
          queryWordInfo,
          dispatch,
          buildTranslationDisplay,
          session.generation,
        );
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
          const displayResult = buildTranslationDisplay(finalResult);
          if (displayResult) {
            dispatch({ type: "SET_RESULT", queryResult: displayResult, generation: session.generation });
          }
        }

        debouncer.clear();
      } catch (error) {
        debouncer?.clear(false);
        showErrorToast(error);
      } finally {
        dispatch({ type: "FINISH_QUERY", queryType: config.type, generation: session.generation });
      }
    },
    [buildTranslationDisplay],
  );

  const runDictionaryQuery = useCallback(
    async (config: DictionaryServiceConfig, queryWordInfo: QueryInput, session: QuerySession) => {
      const enabled = config.isEnabled?.(queryWordInfo) ?? myPreferences[config.preference];
      if (!enabled) return;

      dispatch({ type: "START_QUERY", queryType: config.type, generation: session.generation });
      const instance = new config.provider();

      try {
        const result = await instance.request(queryWordInfo, { signal: session.signal });
        const displaySections = result.displaySections;
        if (displaySections?.length) {
          const queryResult: DictionaryQueryResult = { ...result, displaySections };
          dispatch({ type: "SET_RESULT", queryResult, generation: session.generation });

          const wordInfo = queryResult.queryWordInfo;
          const shouldAutoPlay =
            myPreferences.enableAutomaticPlayWordAudio &&
            wordInfo.isWord &&
            wordInfo.fromLanguage === englishLanguageItem.youdaoLangCode &&
            session.generation === generationRef.current &&
            !session.signal.aborted &&
            isCurrentQueryRef.current &&
            !hasPlayedAudioRef.current;

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
        showErrorToast(error);
      } finally {
        dispatch({ type: "FINISH_QUERY", queryType: config.type, generation: session.generation });
      }
    },
    [],
  );

  const runAllProviders = useCallback(
    (queryWordInfo: QueryInput, session: QuerySession) => {
      for (const config of dictionaryProviderServices) {
        runDictionaryQuery(config, queryWordInfo, session);
      }

      for (const config of translationServices) {
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

  const clearQueryResult = useCallback(() => {
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
