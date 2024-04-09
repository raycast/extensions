import { randomUUID } from "crypto";
import { History } from "../types";
import { createStore } from "../utils";

interface HistoryState {
  history: History[];
  addItem: (history: Omit<History, "id">) => void;
  removeItem: (id: string) => void;
  removeAll: () => void;
}

const initialState = [] as History[];

export const useHistoryState = createStore<HistoryState>("history", (set) => ({
  history: initialState,

  addItem: (entry: Omit<History, "id">) => {
    set((state) => ({
      history: [
        ...state.history,
        {
          id: randomUUID(),
          ...entry,
        },
      ],
    }));
  },
  removeItem: (id: string) => {
    set((state) => ({
      history: state.history.filter((item) => item.id !== id),
    }));
  },
  removeAll: () => {
    set({
      history: [],
    });
  },
}));
