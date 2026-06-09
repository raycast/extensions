import { LocalStorage } from "@raycast/api";
import { DEFAULT_DICTIONARY } from "./defaultDictionary";

export interface DictEntry {
  /** Traditional Chinese form, e.g. 資料庫 */
  traditional: string;
  /** Simplified Chinese form, e.g. 数据库 */
  simplified: string;
}

const STORAGE_KEY = "dictionary-entries";

function isValidEntry(e: unknown): e is DictEntry {
  return (
    !!e &&
    typeof (e as DictEntry).traditional === "string" &&
    typeof (e as DictEntry).simplified === "string"
  );
}

export async function getDictionary(): Promise<DictEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (raw === undefined) {
    // First ever run: seed the preset dictionary so conversion works
    // out of the box.
    await saveDictionary(DEFAULT_DICTIONARY);
    return DEFAULT_DICTIONARY;
  }
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidEntry);
    }
  } catch {
    // Corrupt data, fall through to empty list.
  }
  return [];
}

export async function saveDictionary(entries: DictEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Merge the preset dictionary into the existing entries, skipping any whose
 * traditional or simplified form already exists. Returns the merged list and
 * how many entries were newly added.
 */
export async function mergeDefaultDictionary(
  existing: DictEntry[],
): Promise<{ entries: DictEntry[]; added: number }> {
  const seenTraditional = new Set(existing.map((e) => e.traditional));
  const seenSimplified = new Set(existing.map((e) => e.simplified));

  const additions = DEFAULT_DICTIONARY.filter(
    (e) =>
      !seenTraditional.has(e.traditional) && !seenSimplified.has(e.simplified),
  );

  const merged = [...existing, ...additions];
  await saveDictionary(merged);
  return { entries: merged, added: additions.length };
}
