import { getLanguagePair, LanguagePair } from "../lib/languages";

type Result = { pair: LanguagePair; error: null } | { pair: null; error: string };

export function useLanguagePair(): Result {
  try {
    return { pair: getLanguagePair(), error: null };
  } catch (e) {
    return { pair: null, error: e instanceof Error ? e.message : "Invalid language configuration." };
  }
}
