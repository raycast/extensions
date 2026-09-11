import { usePromise } from "@raycast/utils";
import { getAvailableTerminals } from "./terminals";
import { Terminal } from "./types";

/**
 * Hook: Get the list of available terminals
 */
export function useTerminals() {
  return usePromise(async () => {
    let terminals: Terminal[] = [];
    try {
      terminals = await getAvailableTerminals();
    } catch (e) {
      console.error("Failed to get terminals:", e);
    }
    return terminals;
  }, []);
}
