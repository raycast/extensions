import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

const STORAGE_KEY = "search-history";
const MAX_ENTRIES = 25;

// useLocalStorage persists JSON.stringify(value) under the key. Mutations
// re-read that stored value instead of using the render snapshot — otherwise
// an add() racing the initial async read would clobber the whole history,
// and rapid successive mutations would build on stale state.
async function readStored(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (typeof raw !== "string") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

// When the preference is off, reads return nothing and writes are skipped,
// but existing entries are preserved so re-enabling the preference restores
// them. Clear History wipes them for good.
export function useSearchHistory(enabled: boolean) {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(STORAGE_KEY, []);

  async function add(query: string) {
    const trimmed = query.trim();
    if (!enabled || trimmed.length === 0) {
      return;
    }
    const current = await readStored();
    const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())];
    await setValue(next.slice(0, MAX_ENTRIES));
  }

  async function remove(query: string) {
    const current = await readStored();
    await setValue(current.filter((entry) => entry !== query));
  }

  async function clear() {
    await setValue([]);
  }

  return {
    entries: enabled ? (value ?? []) : [],
    isLoading: enabled && isLoading,
    add,
    remove,
    clear,
  };
}
