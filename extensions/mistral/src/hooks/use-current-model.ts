import { getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import type { Preferences } from "../types/preferences";
import { DEFAULT_MODEL_ID, validateModelId } from "../utils/models";

export function useCurrentModel() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultModel = preferences.defaultModel || DEFAULT_MODEL_ID;
  const { value: storedValue, setValue, isLoading } = useLocalStorage<string>("mistral-model", defaultModel);

  const value = validateModelId(storedValue, defaultModel);

  return { value, setValue, isLoading };
}
