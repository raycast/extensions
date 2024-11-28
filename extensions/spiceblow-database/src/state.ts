import { LocalStorage } from "@raycast/api";
import { SQLStatement } from "sql-template-strings";
import { create, StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface StoreOptions<T> {
  name: string;
  state: StateCreator<T>;
}

function createStore<T>({ name, state }: StoreOptions<T>) {
  return create<T>()(
    persist(state, {
      name,
      storage: createJSONStorage(() => ({
        getItem: (name: string): Promise<string | null> =>
          LocalStorage.getItem(name).then((value) => value?.toString() ?? null),
        setItem: (name: string, value: string) => LocalStorage.setItem(name, value),
        removeItem: (name: string) => LocalStorage.removeItem(name),
      })),
    }),
  );
}

export const useGlobalState = createStore<{
  connectionString: string;
  transactionQueries: SQLStatement[];
  setConnectionString: (connectionString: string) => void;
  resetTransactionQueries: () => void;
  addQueriesToTransaction: (...queries: SQLStatement[]) => void;
}>({
  name: "globalState",
  state: (set) => ({
    connectionString: "",
    transactionQueries: [],
    setConnectionString: (connectionString: string) => {
      return set({ connectionString });
    },
    resetTransactionQueries: () => {
      set({ transactionQueries: [] });
    },
    addQueriesToTransaction: (...queries: SQLStatement[]) => {
      set((state) => ({
        transactionQueries: [...state.transactionQueries, ...queries],
      }));
    },
  }),
});
