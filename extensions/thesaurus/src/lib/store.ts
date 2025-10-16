import { create } from "zustand";
import { Result } from "./types/types";

interface Store {
  word: string;
  setWord: (word: string) => void;
  results: undefined | Result;
  setResults: (results: undefined | Result) => void;
}

const useStore = create<Store>()((set) => ({
  word: "",
  setWord: (word: string) => set({ word }),
  results: undefined,
  setResults: (results: undefined | Result) => set({ results }),
}));

export default useStore;
