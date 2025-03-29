import { useLocalStorage } from "@raycast/utils";

export function useCurrentModel() {
  return useLocalStorage<string>("model", "mistral-small-latest");
}
