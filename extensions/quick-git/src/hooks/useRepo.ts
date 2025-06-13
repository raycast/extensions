import { useLocalStorage } from "@raycast/utils";

export function useRepo() {
  return useLocalStorage<string>("selectedRepo");
}
