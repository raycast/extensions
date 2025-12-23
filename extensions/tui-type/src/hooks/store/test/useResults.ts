import { useMemo } from "react";
import { useTestStore } from "./useTestState";
import { useSettingsStore } from "../settings/useSettings";

export const useResults = () => {
  const { mode, limit } = useSettingsStore();

  const { startTime, typedWords, words, currentInput } = useTestStore();

  return useMemo(() => {
    if (!startTime) {
      return {
        correctChars: 0,
        wrongChars: 0,
        typedChars: 0,
        timeInMinutes: 0,
        accuracy: 0,
        wpm: 0,
      };
    }

    const finalTyped = [...typedWords];
    if (currentInput.length > 0) finalTyped.push(currentInput);

    let correctChars = 0;
    let wrongChars = 0;
    let totalTyped = 0;
    let correctWordsCount = 0;

    finalTyped.forEach((typed, idx) => {
      const target = words[idx] || "";
      const isLast = idx === finalTyped.length - 1;
      const spaceBonus = isLast ? 0 : 1;

      totalTyped += typed.length + spaceBonus;

      if (typed === target) {
        correctWordsCount++;
      }

      for (let i = 0; i < Math.max(typed.length, target.length); i++) {
        if (typed[i] === target[i]) correctChars++;
        else wrongChars++;
      }
    });

    const durationMs = Date.now() - startTime;
    const timeInMinutes = Math.max(durationMs, 1) / 60000;
    const wpm = Math.round(correctWordsCount / timeInMinutes);

    const accuracy =
      totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

    return {
      correctChars,
      wrongChars,
      typedChars: totalTyped,
      timeInMinutes,
      wpm,
      accuracy,
    };
  }, [mode, limit, startTime, typedWords, words, currentInput]);
};
