import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useFetch, useCachedState } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import {
  Mode,
  RenderMode,
  UpdateFreq,
  SvgSettings,
  TerminalSettings,
  Quote,
} from "../types";
import { ZWS, COMMON_WORDS, QUOTE_GROUPS } from "../constants";
import { DEFAULT_SVG } from "../config/svg-config";
import { DEFAULT_TERM } from "../config/terminal-config";
import { getUpdateDelay } from "../config/update-frequency-config";
import { getCharsPerLine } from "../config/render-mode-config";

export interface TypingGameState {
  // Settings
  mode: Mode;
  limit: number;
  language: string;
  renderMode: RenderMode;
  updateFreq: UpdateFreq;
  svgSettings: SvgSettings;
  termSettings: TerminalSettings;
  usePunctuation: boolean;
  useNumbers: boolean;

  // Game State
  words: string[];
  searchText: string;
  startTime: number | null;
  isFinished: boolean;
  quoteSource: string | null;
  isLoading: boolean;
  forcedSelectionId: string | undefined;
  isLoadingWords: boolean;
  isLoadingQuotes: boolean;
  visualTick: number;

  // Computed
  linesLayout: number[][];
  modeSubtitle: string;

  // Actions
  setMode: (mode: Mode) => void;
  setLimit: (limit: number) => void;
  setLanguage: (language: string) => void;
  setRenderMode: (mode: RenderMode) => void;
  setUpdateFreq: (freq: UpdateFreq) => void;
  setSvgSettings: (settings: SvgSettings) => void;
  setTermSettings: (settings: TerminalSettings) => void;
  setUsePunctuation: (value: boolean) => void;
  setUseNumbers: (value: boolean) => void;
  setModeAndReset: (m: Mode, l: number, p: boolean, n: boolean) => void;

  resetGame: (
    newMode?: Mode,
    newLimit?: number,
    shouldSnapFocus?: boolean,
  ) => void;
  handleInputChange: (text: string) => void;
  onSelectionChange: (id: string | null) => void;

  // Refs exposed for rendering
  typedWordsRef: React.MutableRefObject<string[]>;
  currentInputRef: React.MutableRefObject<string>;

  // Results data
  getResults: () => {
    correctChars: number;
    wrongChars: number;
    typedChars: number;
    timeInMinutes: number;
  };
}

enum TypingGameStorageKey {
  Mode = "tg-mode",
  Limit = "tg-limit",
  Language = "tg-lang",
  RenderMode = "tg-render-mode",
  UpdateFreq = "tg-freq",
  SvgSettings = "tg-settings-svg",
  TermSettings = "tg-settings-term",
  UsePunctuation = "tg-punct",
  UseNumbers = "tg-nums",
}

const useConfigurationState = () => {
  const [mode, setMode] = useCachedState<Mode>(
    TypingGameStorageKey.Mode,
    "time",
  );
  const [limit, setLimit] = useCachedState<number>(
    TypingGameStorageKey.Limit,
    30,
  );
  const [language, setLanguage] = useCachedState<string>(
    TypingGameStorageKey.Language,
    "english",
  );
  const [renderMode, setRenderMode] = useCachedState<RenderMode>(
    TypingGameStorageKey.RenderMode,
    "svg",
  );
  const [updateFreq, setUpdateFreq] = useCachedState<UpdateFreq>(
    TypingGameStorageKey.UpdateFreq,
    "instant",
  );
  const [svgSettings, setSvgSettings] = useCachedState<SvgSettings>(
    TypingGameStorageKey.SvgSettings,
    DEFAULT_SVG,
  );
  const [termSettings, setTermSettings] = useCachedState<TerminalSettings>(
    TypingGameStorageKey.TermSettings,
    DEFAULT_TERM,
  );
  const [usePunctuation, setUsePunctuation] = useCachedState<boolean>(
    TypingGameStorageKey.UsePunctuation,
    false,
  );
  const [useNumbers, setUseNumbers] = useCachedState<boolean>(
    TypingGameStorageKey.UseNumbers,
    false,
  );

  return {
    mode,
    setMode,
    limit,
    setLimit,
    language,
    setLanguage,
    renderMode,
    setRenderMode,
    updateFreq,
    setUpdateFreq,
    svgSettings,
    setSvgSettings,
    termSettings,
    setTermSettings,
    usePunctuation,
    setUsePunctuation,
    useNumbers,
    setUseNumbers,
  };
};

export function useTypingGame(
  onFinish: (results: {
    correctChars: number;
    wrongChars: number;
    typedChars: number;
    timeInMinutes: number;
    onRestart: () => void;
  }) => void,
): TypingGameState {
  const {
    mode,
    setMode,
    limit,
    setLimit,
    language,
    setLanguage,
    renderMode,
    setRenderMode,
    updateFreq,
    setUpdateFreq,
    svgSettings,
    setSvgSettings,
    termSettings,
    setTermSettings,
    usePunctuation,
    setUsePunctuation,
    useNumbers,
    setUseNumbers,
  } = useConfigurationState();

  // --- Game State ---
  const typedWordsRef = useRef<string[]>([]);
  const currentInputRef = useRef<string>("");
  const wordsRef = useRef<string[]>([]);

  const [visualTick, setVisualTick] = useState(0);
  const lastVisualUpdateRef = useRef(0);
  const pendingUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [words, setWords] = useState<string[]>([]);
  const [searchText, setSearchText] = useState(ZWS);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [quoteSource, setQuoteSource] = useState<string | null>(null);
  const [forcedSelectionId, setForcedSelectionId] = useState<
    string | undefined
  >("typing-area");
  const selectionRef = useRef<string>("typing-area");

  // --- Monkey-type data fetching ---
  const { data: rawData, isLoading: isLoadingWords } = useFetch<{
    words: string[];
  }>(
    `https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/${language}.json`,
    {
      parseResponse: async (response) => JSON.parse(await response.text()),
      keepPreviousData: false,
    },
  );

  const { data: quotesData, isLoading: isLoadingQuotes } = useFetch<{
    quotes: Quote[];
  }>(
    `https://raw.githubusercontent.com/monkeytypegame/monkeytype/refs/heads/master/frontend/static/quotes/${language}.json`,
    {
      keepPreviousData: false,
      parseResponse: async (response) => JSON.parse(await response.text()),
      execute: true,
      onError: () => {
        // Silently fail - we check quotesData in resetGame
      },
    },
  );

  const resetGame = useCallback(
    (newMode?: Mode, newLimit?: number, shouldSnapFocus = true) => {
      const targetMode = newMode || mode;
      const targetLimit = newLimit !== undefined ? newLimit : limit;

      // --- Quote Mode Logic ---
      if (targetMode === "quote") {
        if (
          !quotesData ||
          !quotesData.quotes ||
          quotesData.quotes.length === 0
        ) {
          showToast(
            Toast.Style.Failure,
            "Quotes not available",
            `Falling back to Time mode for ${language}`,
          );
          setMode("time");
          setLimit(30);
          resetGame("time", 30, true);
          return;
        }

        const group =
          QUOTE_GROUPS.find((g) => g.id === targetLimit) || QUOTE_GROUPS[1];
        const validQuotes = quotesData.quotes.filter(
          (q) => q.length >= group.min && q.length <= group.max,
        );

        if (validQuotes.length === 0) {
          showToast(
            Toast.Style.Failure,
            "No quotes found",
            `No quotes found in length range: ${group.label}`,
          );
          const anyQuote =
            quotesData.quotes[
              Math.floor(Math.random() * quotesData.quotes.length)
            ];
          if (anyQuote) {
            setWords(anyQuote.text.split(" "));
            wordsRef.current = anyQuote.text.split(" ");
            setQuoteSource(
              `${anyQuote.source} (ID: ${anyQuote.id}) [Random Fallback]`,
            );
          } else {
            setMode("time");
            setLimit(30);
            resetGame("time", 30, true);
            return;
          }
        } else {
          const randomQuote =
            validQuotes[Math.floor(Math.random() * validQuotes.length)];
          setWords(randomQuote.text.split(" "));
          wordsRef.current = randomQuote.text.split(" ");
          setQuoteSource(`${randomQuote.source} (ID: ${randomQuote.id})`);
        }
      } else {
        setQuoteSource(null);

        const wordPool = [...(rawData?.words || COMMON_WORDS)];

        if (useNumbers) {
          const numCount = Math.floor(wordPool.length * 0.2);
          for (let i = 0; i < numCount; i++) {
            wordPool.push(Math.floor(Math.random() * 1000).toString());
          }
        }

        const needed = targetMode === "words" ? targetLimit : 200;
        let generated = Array.from(
          { length: needed },
          () => wordPool[Math.floor(Math.random() * wordPool.length)],
        );

        if (usePunctuation) {
          const punctuationMarks = [".", ",", "!", "?", ";", ":", '"', "'"];
          generated = generated.map((word) => {
            if (Math.random() < 0.3) {
              let newWord = word.charAt(0).toUpperCase() + word.slice(1);
              const mark =
                punctuationMarks[
                  Math.floor(Math.random() * punctuationMarks.length)
                ];

              if (mark === '"' || mark === "'") {
                newWord = `${mark}${newWord}${mark}`;
              } else {
                newWord = `${newWord}${mark}`;
              }
              return newWord;
            }
            return word;
          });
        }

        wordsRef.current = generated;
        setWords(generated);
      }

      typedWordsRef.current = [];
      currentInputRef.current = "";

      setSearchText(ZWS);
      setStartTime(null);
      setIsFinished(false);
      setVisualTick((t) => t + 1);
      if (pendingUpdateTimeoutRef.current)
        clearTimeout(pendingUpdateTimeoutRef.current);

      if (shouldSnapFocus) {
        setForcedSelectionId("typing-area");
        selectionRef.current = "typing-area";
      }
    },
    [rawData, quotesData, mode, limit, language, usePunctuation, useNumbers],
  );

  const setModeAndReset = (
    modeToUse: typeof mode,
    limit: number,
    usePunctuation: boolean,
    useNumbers: boolean,
  ) => {
    setMode(modeToUse);
    setLimit(limit);
    setUsePunctuation(usePunctuation);
    setUseNumbers(useNumbers);
    setTimeout(() => resetGame(modeToUse, limit, true), 50);
    showToast(Toast.Style.Success, "Mode updated");
  };

  useEffect(() => {
    if (rawData && !startTime && !isFinished) {
      resetGame(mode, limit, false);
    }
    return undefined;
  }, [rawData, startTime, isFinished, resetGame, mode, limit]);

  useEffect(() => {
    if (mode === "quote" && quotesData && !startTime && !isFinished) {
      resetGame(mode, limit, false);
    }
    return undefined;
  }, [quotesData, mode, startTime, isFinished, resetGame, limit]);

  useEffect(() => {
    return () => {
      if (pendingUpdateTimeoutRef.current)
        clearTimeout(pendingUpdateTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (forcedSelectionId) {
      const timer = setTimeout(() => setForcedSelectionId(undefined), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [forcedSelectionId]);

  const onSelectionChange = (id: string | null) => {
    if (id) selectionRef.current = id;
  };

  const getResults = useCallback(() => {
    const finalTyped = [...typedWordsRef.current];
    if (currentInputRef.current.length > 0)
      finalTyped.push(currentInputRef.current);

    let correctChars = 0;
    let wrongChars = 0;
    let totalTyped = 0;

    finalTyped.forEach((typed, idx) => {
      const target = wordsRef.current[idx] || "";
      totalTyped += typed.length + 1;
      for (let i = 0; i < Math.max(typed.length, target.length); i++) {
        if (typed[i] === target[i]) correctChars++;
        else wrongChars++;
      }
    });

    const finalTime =
      mode === "time"
        ? limit / 60
        : (Date.now() - (startTime || Date.now())) / 60000;

    return {
      correctChars,
      wrongChars,
      typedChars: totalTyped,
      timeInMinutes: finalTime,
    };
  }, [mode, limit, startTime]);

  const finishTest = useCallback(() => {
    setIsFinished(true);
    const results = getResults();
    onFinish({
      ...results,
      onRestart: () => resetGame(),
    });
  }, [getResults, onFinish, resetGame]);

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
      setVisualTick((t) => t + 1);
      lastVisualUpdateRef.current = now;
    } else {
      pendingUpdateTimeoutRef.current = setTimeout(() => {
        setVisualTick((t) => t + 1);
        lastVisualUpdateRef.current = Date.now();
      }, delay - timeSinceLast);
    }
  }, [updateFreq]);

  const handleInputChange = (text: string) => {
    if (text.length === 0) {
      if (typedWordsRef.current.length > 0) {
        const prevWord = typedWordsRef.current.pop();
        if (prevWord) {
          currentInputRef.current = prevWord;
          setSearchText(ZWS + currentInputRef.current);
          triggerVisualUpdate();
        }
      } else {
        setSearchText(ZWS);
      }
      return;
    }

    if (isFinished) return;

    const rawInput = text.startsWith(ZWS) ? text.slice(ZWS.length) : text;

    if (!startTime && rawInput.length > 0) {
      setStartTime(Date.now());
    }

    if (rawInput.endsWith(" ")) {
      const trimmed = rawInput.trim();

      if (trimmed.length > 0) {
        typedWordsRef.current.push(trimmed);
        currentInputRef.current = "";
        setSearchText(ZWS);

        setVisualTick((t) => t + 1);
        lastVisualUpdateRef.current = Date.now();
        if (pendingUpdateTimeoutRef.current)
          clearTimeout(pendingUpdateTimeoutRef.current);

        const isWordsModeFinish =
          mode === "words" && typedWordsRef.current.length >= limit;
        const isQuoteModeFinish =
          mode === "quote" &&
          typedWordsRef.current.length >= wordsRef.current.length;

        if (isWordsModeFinish || isQuoteModeFinish) {
          finishTest();
          return;
        }
      } else {
        setSearchText(ZWS);
      }
    } else {
      currentInputRef.current = rawInput;
      setSearchText(ZWS + rawInput);
      triggerVisualUpdate();
    }
  };

  const charsLimit = getCharsPerLine(renderMode);
  const linesLayout = useMemo(() => {
    const lines: number[][] = [];
    let currentLine: number[] = [];
    let currentLen = 0;
    words.forEach((word, index) => {
      if (currentLen + word.length + 1 > charsLimit) {
        lines.push(currentLine);
        currentLine = [];
        currentLen = 0;
      }
      currentLine.push(index);
      currentLen += word.length + 1;
    });
    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
  }, [words, charsLimit]);

  const getModeSubtitle = useCallback(() => {
    if (mode === "quote") {
      const group = QUOTE_GROUPS.find((g) => g.id === limit);
      return `Quote (${group?.label || "Random"})`;
    }

    const base = mode === "time" ? `${limit}s` : `${limit} words`;
    const mods = [];
    if (usePunctuation) mods.push("Punctuation");
    if (useNumbers) mods.push("Numbers");

    if (mods.length > 0) return `${base} + ${mods.join(", ")}`;
    return base;
  }, [mode, limit, usePunctuation, useNumbers]);

  return {
    // Settings
    mode,
    limit,
    language,
    renderMode,
    updateFreq,
    svgSettings,
    termSettings,
    usePunctuation,
    useNumbers,

    // Game State
    words,
    searchText,
    startTime,
    isFinished,
    quoteSource,
    isLoading: isLoadingWords || isLoadingQuotes,
    forcedSelectionId,
    isLoadingWords,
    isLoadingQuotes,
    visualTick,

    // Computed
    linesLayout,
    modeSubtitle: getModeSubtitle(),

    // Actions
    setMode,
    setLimit,
    setLanguage,
    setRenderMode,
    setUpdateFreq,
    setSvgSettings,
    setTermSettings,
    setUsePunctuation,
    setUseNumbers,
    setModeAndReset,

    resetGame,
    handleInputChange,
    onSelectionChange,

    // Refs
    typedWordsRef,
    currentInputRef,

    // Results
    getResults,
  };
}
