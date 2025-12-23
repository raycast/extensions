import { useEffect, useRef, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { Mode } from "../../../types";
import { ZWS, COMMON_WORDS, TYPING_AREA_ID } from "../../../constants";
import { getUpdateDelay } from "../../../config/update-frequency-config";
import { useSettingsStore } from "../settings/useSettings";
import { useTestStore } from "./useTestState";
import {
  isQuoteContent,
  isWordContent,
  useTypingContent,
} from "../../useTypingData";
import { getQuote, getWords } from "../../../utils/test-utils";

export function useTest(
  onFinish?: (results: { onRestart: () => void }) => void,
) {
  const {
    mode,
    setMode,
    limit,
    setLimit,
    language,
    updateFreq,
    usePunctuation,
    useNumbers,
  } = useSettingsStore();

  const {
    visualTick,
    setVisualTick,
    words,
    setWords,
    setSearchText,
    startTime,
    setStartTime,
    isFinished,
    setIsFinished,
    setQuoteSource,
    forcedSelectionId,
    setForcedSelectionId,
    typedWords,
    setTypedWords,
    setCurrentInput,
  } = useTestStore();

  const selectionRef = useRef<string>(TYPING_AREA_ID);

  const lastVisualUpdateRef = useRef(0);
  const pendingUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { content: rawTypingData, isLoading: typingDataIsLoading } =
    useTypingContent(language, mode);

  const resetTest = useCallback(
    (newMode?: Mode, newLimit?: number) => {
      const targetMode = newMode || mode;
      const targetLimit = newLimit !== undefined ? newLimit : limit;

      if (targetMode !== mode) {
        setMode(targetMode);
      }
      if (targetLimit !== limit) {
        setLimit(targetLimit);
      }

      setTypedWords([]);
      setCurrentInput("");
      setQuoteSource(null);
      setSearchText(ZWS);
      setStartTime(null);
      setIsFinished(false);
      setVisualTick(visualTick + 1);

      setForcedSelectionId(TYPING_AREA_ID);
      selectionRef.current = TYPING_AREA_ID;

      if (pendingUpdateTimeoutRef.current) {
        clearTimeout(pendingUpdateTimeoutRef.current);
      }

      if (targetMode === "quote") {
        if (!isQuoteContent(rawTypingData)) {
          showToast(
            Toast.Style.Failure,
            "Quotes not available",
            `Falling back to Time mode`,
          );
          resetTest("time", 30);
          return;
        }

        const { words, source } = getQuote(rawTypingData, targetLimit);

        if (words.length === 0) {
          resetTest("time", 30);
          return;
        }

        setWords(words);
        setQuoteSource(source);
        return;
      }

      if (!isWordContent(rawTypingData)) {
        showToast(
          Toast.Style.Failure,
          "Words not available",
          `Try a different language`,
        );
        return;
      }

      const generatedWords = getWords(
        rawTypingData || COMMON_WORDS,
        targetLimit,
        targetMode,
        useNumbers,
        usePunctuation,
      );

      setWords(generatedWords);
      return;
    },
    // Dependencies
    [rawTypingData, limit, mode, usePunctuation, useNumbers, visualTick],
  );

  useEffect(() => {
    return () => {
      if (pendingUpdateTimeoutRef.current) {
        clearTimeout(pendingUpdateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (forcedSelectionId) {
      const timer = setTimeout(() => setForcedSelectionId(undefined), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [forcedSelectionId]);

  useEffect(() => {
    if (typingDataIsLoading) return;

    const debounceTimeout = setTimeout(() => {
      resetTest();
    }, 50);

    return () => clearTimeout(debounceTimeout);
  }, [limit, typingDataIsLoading, usePunctuation, useNumbers]);

  const onSelectionChange = (id: string | null) => {
    if (id) selectionRef.current = id;
  };

  const finishTest = useCallback(() => {
    setIsFinished(true);
    onFinish?.({
      onRestart: () => resetTest(),
    });
  }, [onFinish, resetTest]);

  useEffect(() => {
    if (mode === "time" && startTime && !isFinished) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (limit - elapsed <= 0) finishTest();
      }, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [startTime, mode, limit, isFinished, finishTest]);

  const triggerVisualUpdate = useCallback(() => {
    const now = Date.now();
    const delay = getUpdateDelay(updateFreq);

    const timeSinceLast = now - lastVisualUpdateRef.current;
    if (pendingUpdateTimeoutRef.current) {
      clearTimeout(pendingUpdateTimeoutRef.current);
      pendingUpdateTimeoutRef.current = null;
    }

    if (delay === 0 || timeSinceLast >= delay) {
      setVisualTick(visualTick + 1);
      lastVisualUpdateRef.current = now;
    } else {
      pendingUpdateTimeoutRef.current = setTimeout(() => {
        setVisualTick(visualTick + 1);
        lastVisualUpdateRef.current = Date.now();
      }, delay - timeSinceLast);
    }
  }, [updateFreq]);

  const handleInputChange = (text: string) => {
    if (text.length === 0) {
      if (typedWords.length === 0) {
        setSearchText("");
        setCurrentInput("");
        return;
      }

      const newHistory = [...typedWords];
      const prevWord = newHistory.pop() || "";

      setTypedWords(newHistory);
      setCurrentInput(prevWord);
      setSearchText(ZWS + prevWord);
      triggerVisualUpdate();
      return;
    }

    if (isFinished) return;

    const rawInput = text.startsWith(ZWS) ? text.slice(ZWS.length) : text;

    if (!startTime && rawInput.length > 0) {
      setStartTime(Date.now());
    }

    if (rawInput.includes(" ")) {
      const splitIndex = rawInput.indexOf(" ");
      const potentialWord = rawInput.slice(0, splitIndex);
      const nextInputStart = rawInput.slice(splitIndex + 1);

      const trimmed = potentialWord.trim();

      if (trimmed.length === 0) {
        setSearchText(ZWS + nextInputStart);
        setCurrentInput(nextInputStart);
        return;
      }

      const newTypedWords = [...typedWords, trimmed];
      setTypedWords(newTypedWords);

      setCurrentInput(nextInputStart);
      setSearchText(ZWS + nextInputStart);

      setVisualTick(visualTick + 1);
      lastVisualUpdateRef.current = Date.now();
      if (pendingUpdateTimeoutRef.current) {
        clearTimeout(pendingUpdateTimeoutRef.current);
      }

      const isWordsModeFinish =
        mode === "words" && newTypedWords.length >= limit;
      const isQuoteModeFinish =
        mode === "quote" && newTypedWords.length >= words.length;

      if (isWordsModeFinish || isQuoteModeFinish) {
        finishTest();
      }

      return;
    }

    setCurrentInput(rawInput);
    setSearchText(ZWS + rawInput);
    triggerVisualUpdate();
  };

  return {
    // State
    typingDataIsLoading,

    // Actions,
    resetTest,
    handleInputChange,
    onSelectionChange,
  };
}
