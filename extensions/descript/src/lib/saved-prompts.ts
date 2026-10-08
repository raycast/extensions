import { useLocalStorage } from "@raycast/utils";

const STORAGE_KEY = "descript:saved-prompts:v1";

export type SavedPrompt = {
  id: string;
  label: string;
  prompt: string;
  createdAt: string;
};

export function useSavedPrompts() {
  const { value, setValue, removeValue, isLoading } = useLocalStorage<SavedPrompt[]>(STORAGE_KEY, []);
  const prompts = value ?? [];

  async function save(input: { label: string; prompt: string }): Promise<SavedPrompt> {
    const entry: SavedPrompt = {
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: input.label.trim() || defaultLabel(input.prompt),
      prompt: input.prompt.trim(),
      createdAt: new Date().toISOString(),
    };
    await setValue([entry, ...prompts].slice(0, 100));
    return entry;
  }

  async function remove(id: string): Promise<void> {
    await setValue(prompts.filter((p) => p.id !== id));
  }

  return { prompts, isLoading, save, remove, clear: removeValue };
}

export function defaultLabel(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed || "Untitled prompt";
  return `${trimmed.slice(0, 57)}…`;
}
