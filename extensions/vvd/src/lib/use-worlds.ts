import { useCachedPromise } from "@raycast/utils"

import { type Connection, type World, listWorlds } from "./vvd"

/**
 * The worlds behind a connection, cached so a command opens on the last list
 * while the fresh one loads. Keyed by origin + source (never the key itself —
 * the cache key would otherwise carry the secret).
 */
export function useWorlds(connection: Connection | null | undefined): {
  worlds: World[]
  isLoading: boolean
  error: unknown
  revalidate: () => void
} {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (origin: string, source: string): Promise<World[]> => {
      // The args are the cache key; a stale closure over an older connection
      // must not answer for a newer one.
      if (
        !connection ||
        connection.origin !== origin ||
        connection.source !== source
      )
        return []
      return listWorlds(connection)
    },
    [connection?.origin ?? "", connection?.source ?? ""],
    {
      execute: Boolean(connection),
      keepPreviousData: true,
      // The views render the error themselves; no duplicate failure toast.
      onError: () => {},
    },
  )
  return { worlds: data ?? [], isLoading, error, revalidate }
}
