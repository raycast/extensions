import { useLocalStorage } from "@raycast/utils";

const KEY = "charter-recent";
const LIMIT = 5;

/** The last few chart types opened or copied from, newest first. */
export function useRecent() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(KEY, []);
  const recent = value ?? [];

  async function record(id: string) {
    await setValue([id, ...recent.filter((item) => item !== id)].slice(0, LIMIT));
  }

  async function clear() {
    await setValue([]);
  }

  return { recent, record, clear, isLoading };
}
