import { useCachedPromise } from "@raycast/utils";
import { getDeferredSet, getManualTodos, getStatusMap } from "./storage";
import { LocalStatus, ManualTodo } from "./types";

/**
 * The personal planning layer (local status + deferred set + manual notes)
 * loaded in its own cached source, kept separate from the slow ADO fetch so it's
 * correct from the first paint on reopen instead of flashing empty. Arrays keep
 * it JSON-serializable for Raycast's cache. `revalidateLocal` re-reads
 * LocalStorage after a local edit (no ADO refetch).
 */
export function useLocalLayer() {
  const { data, revalidate } = useCachedPromise(
    async () => {
      const [statusMap, deferredSet, notes] = await Promise.all([
        getStatusMap(),
        getDeferredSet(),
        getManualTodos(),
      ]);
      return {
        statusEntries: [...statusMap] as [number, LocalStatus][],
        deferredIds: [...deferredSet],
        notes,
      };
    },
    [],
    { keepPreviousData: true },
  );

  const statusMap = new Map<number, LocalStatus>(data?.statusEntries ?? []);
  const deferred = new Set<number>(data?.deferredIds ?? []);
  const notes: ManualTodo[] = data?.notes ?? [];
  const statusOf = (id: number): LocalStatus =>
    statusMap.get(id) ?? "not-started";

  return { deferred, statusOf, notes, revalidateLocal: revalidate };
}
