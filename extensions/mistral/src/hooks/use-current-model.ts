import { useLocalStorage } from "@raycast/utils";

export function useCurrentModel() {
  return useLocalStorage<string>("mistral-model", "mistral-small-latest");
}
