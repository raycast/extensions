import { useCachedPromise } from "@raycast/utils"

import { type Connection, type World, listWorlds } from "./vvd"

/**
 * The worlds behind a connection, cached so a command opens on the last list
 * while the fresh one loads. Keyed by origin + the credential's fingerprint
 * (never the key itself): a different key at the same origin is a different
 * account and must not inherit this one's worlds.
 */
export function useWorlds(connection: Connection | null | undefined): {
  worlds: World[]
  isLoading: boolean
  error: unknown
  revalidate: () => void
} {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (origin: string, fingerprint: string): Promise<World[]> => {
      // The args are the cache key; a stale closure over an older connection
      // must not answer for a newer one.
      if (
        !connection ||
        connection.origin !== origin ||
        connection.fingerprint !== fingerprint
      )
        return []
      return listWorlds(connection)
    },
    [connection?.origin ?? "", connection?.fingerprint ?? ""],
    {
      execute: Boolean(connection),
      keepPreviousData: true,
      // The views render the error themselves; no duplicate failure toast.
      onError: () => {},
    },
  )
  return { worlds: data ?? [], isLoading, error, revalidate }
}
