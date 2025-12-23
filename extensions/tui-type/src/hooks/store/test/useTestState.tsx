import { create } from "zustand";
import { ZWS, TYPING_AREA_ID } from "../../../constants";

interface TestState {
  visualTick: number;
  words: string[];
  typedWords: string[];
  currentInput: string;
  searchText: string;
  startTime: number | null;
  isFinished: boolean;
  quoteSource: string | null;
  forcedSelectionId: string | undefined;

  setVisualTick: (v: number) => void;
  setWords: (v: string[]) => void;
  setTypedWords: (v: string[]) => void;
  setCurrentInput: (v: string) => void;
  setSearchText: (v: string) => void;
  setStartTime: (v: number | null) => void;
  setIsFinished: (v: boolean) => void;
  setQuoteSource: (v: string | null) => void;
  setForcedSelectionId: (v: string | undefined) => void;
}

const initialState = {
  visualTick: 0,
  words: [],
  typedWords: [],
  currentInput: "",
  searchText: ZWS,
  startTime: null,
  isFinished: false,
  quoteSource: null,
  forcedSelectionId: TYPING_AREA_ID,
};

export const useTestStore = create<TestState>((set) => ({
  ...initialState,

  setVisualTick: (v) => set({ visualTick: v }),
  setWords: (v) => set({ words: v }),
  setTypedWords: (v) => set({ typedWords: v }),
  setCurrentInput: (v) => set({ currentInput: v }),
  setSearchText: (v) => set({ searchText: v }),
  setStartTime: (v) => set({ startTime: v }),
  setIsFinished: (v) => set({ isFinished: v }),
  setQuoteSource: (v) => set({ quoteSource: v }),
  setForcedSelectionId: (v) => set({ forcedSelectionId: v }),
}));
