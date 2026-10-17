import { useCachedPromise } from "@raycast/utils"

import { type Connection, getConnection } from "./vvd"

/**
 * The connection every view starts from. Cached so a command opens on the last
 * answer and re-reads the key behind it; `refresh` after Connect/Disconnect.
 */
export function useConnection(): {
  connection: Connection | null | undefined
  isLoading: boolean
  refresh: () => void
} {
  const { data, isLoading, revalidate } = useCachedPromise(getConnection, [], {
    keepPreviousData: true,
  })
  return { connection: data, isLoading, refresh: revalidate }
}
