import { logger } from "@chrismessina/raycast-logger";
import { usePromise } from "@raycast/utils";

// Loads data for the selected list row. The result and any error are tagged with the id they
// belong to, so a lookup still in flight for row B never shows row A's data or A's error.
export function useSelectionDetail<T>(selectedId: string | null, load: (id: string) => Promise<T>) {
  const { data } = usePromise(
    async (id: string | null) => {
      if (!id) return undefined;
      try {
        return { id, value: await load(id), error: undefined };
      } catch (error) {
        logger.warn("Loading details failed", { id, error });
        return { id, value: undefined, error: error as Error };
      }
    },
    [selectedId],
  );
  const current = data?.id === selectedId ? data : undefined;
  return { value: current?.value, error: current?.error, isLoading: selectedId !== null && !current };
}
