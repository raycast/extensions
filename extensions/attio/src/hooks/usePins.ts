import { useMemo } from "react";
import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { tokenFingerprint } from "./useSelf";

/** Raycast has no favorites API — pins are local-only, keyed per token + object.
 *  Deliberately NOT namespaced with CACHE_VERSION: pins are user data, not a
 *  cached payload shape — orphaning them on a version bump would lose real
 *  user state for no reason. */
export function usePins(objectSlug: string) {
  const key = `pins:${tokenFingerprint}:${objectSlug}`;

  const { data, isLoading, mutate } = useCachedPromise(
    async (k: string) => {
      const raw = await LocalStorage.getItem<string>(k);
      return raw ? (JSON.parse(raw) as string[]) : [];
    },
    [key],
  );

  const ids = data ?? [];
  const pinned = useMemo(() => new Set(ids), [ids]);

  async function toggle(recordId: string) {
    const next = pinned.has(recordId) ? ids.filter((id) => id !== recordId) : [...ids, recordId];
    await mutate(LocalStorage.setItem(key, JSON.stringify(next)), { optimisticUpdate: () => next });
  }

  return { pinned, toggle, isLoading };
}
