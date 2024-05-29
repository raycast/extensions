/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import extension from "../../extension.json";
import { History } from "../types";
import { createStore } from "../utils";

interface HistoryState {
  history: History[];
  addItem: (history: Omit<History, "id">) => void;
  removeItem: (id: string) => void;
  removeAll: () => void;
}

const initialState = [] as History[];

export const useHistoryState = createStore<HistoryState>({
  name: "history",
  version: extension.version,
  state: (set) => ({
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
  }),
  migrate: (persistedState: any) => {
    return persistedState;
  },
});
