import { useLocalStorage } from "@raycast/utils";
import { updateIds } from "../lib/storage";

const KEY = "charter-recent";
const LIMIT = 5;

/** The last few chart types opened or copied from, newest first. */
export function useRecent() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(KEY, []);
  const recent = value ?? [];

  async function record(id: string) {
    const next = await updateIds(KEY, (ids) => [id, ...ids.filter((item) => item !== id)].slice(0, LIMIT));
    await setValue(next);
  }

  async function clear() {
    await updateIds(KEY, () => []);
    await setValue([]);
  }

  return { recent, record, clear, isLoading };
}
