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
        getItem: async (name: string): Promise<string | null> => {
          const value = await LocalStorage.getItem(name);
          return value?.toString() ?? null;
        },
        setItem: (name: string, value: string) => LocalStorage.setItem(name, value),
        removeItem: (name: string) => LocalStorage.removeItem(name),
      })),
    }),
  );
}

export const useGlobalState = createStore<{
  connectionString: string;
  transactionQueries: SQLStatement[];
  selectedRows: string[];
  setSelectedRows: (rows: string[]) => void;
  toggleRowSelection: (primaryKeyValue: string) => void;
  setConnectionString: (connectionString: string) => void;
  resetTransactionQueries: () => void;
  addQueriesToTransaction: (...queries: SQLStatement[]) => void;
}>({
  name: "globalState",
  state: (set) => ({
    connectionString: "",
    transactionQueries: [],
    selectedRows: [],
    setSelectedRows: (rows: string[]) => {
      set({ selectedRows: rows });
    },
    toggleRowSelection: (primaryKeyValue: string) => {
      set((state) => {
        const newSelectedRows = [...state.selectedRows];
        const index = newSelectedRows.indexOf(primaryKeyValue);
        if (index >= 0) {
          newSelectedRows.splice(index, 1);
        } else {
          newSelectedRows.push(primaryKeyValue);
        }
        return { selectedRows: newSelectedRows };
      });
    },
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
