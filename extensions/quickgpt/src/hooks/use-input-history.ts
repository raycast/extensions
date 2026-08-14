import { useState, useCallback } from "react";
import inputHistoryStore from "../stores/input-history-store";

export function useInputHistory(initialValue: string = "") {
  const [currentInput, setCurrentInput] = useState(initialValue);

  const updateInput = useCallback((value: string) => {
    setCurrentInput(value);
  }, []);

  const addToHistory = useCallback((input: string) => {
    inputHistoryStore.addToHistory(input);
  }, []);

  return {
    currentInput,
    setCurrentInput: updateInput,
    addToHistory,
  };
}
