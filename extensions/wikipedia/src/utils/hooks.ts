import { useCachedState } from "@raycast/utils";

export function useLanguage() {
  return useCachedState("language", "en");
}
