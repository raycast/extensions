import { TITLES_FOR_KEYS } from "./constants";

export function getTitleFromKey(key: string) {
  return TITLES_FOR_KEYS[key as keyof typeof TITLES_FOR_KEYS] || key;
}
