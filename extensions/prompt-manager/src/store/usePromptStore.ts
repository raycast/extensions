import { create } from "zustand";
import { persist, StateStorage, createJSONStorage } from "zustand/middleware";
import { LocalStorage } from "@raycast/api";
import { PromptStore, CreatePromptValues } from "../types";

const raycastStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await LocalStorage.getItem<string>(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await LocalStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await LocalStorage.removeItem(name);
  },
};

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      prompts: [],
      isHydrated: false,
      setHydrated: (state: boolean) => set({ isHydrated: state }),
      addPrompt: (promptData: CreatePromptValues) =>
        set((state) => ({
          prompts: [
            ...state.prompts,
            {
              ...promptData,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
            },
          ],
        })),
      updatePrompt: (id, promptData) =>
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...promptData } : p,
          ),
        })),
      removePrompt: (id) =>
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        })),
    }),
    {
      name: "prompt-storage",
      storage: createJSONStorage(() => raycastStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
