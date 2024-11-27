import { useEffect, useRef, useState } from "react"
import { AbortError } from "node-fetch"
import { showToast, Toast } from "@raycast/api"

import { apiRequest } from "@/functions/api-req"

/**
 * This composable provides hooks to execute searches and access the state of
 * the current search.
 *
 * @param use - the use-case based on which to filter the search results
 * @return the search state and the search function
 */
export function useSearch(use: Use) {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    results: [],
  })
  const [lastSearch, setLastSearch] = useState("")

  const cancelRef = useRef<AbortController | null>(null)

  useEffect(() => {
    search("")
    return () => {
      cancelRef.current?.abort()
    }
  }, [])

  // Repeat current search query when 'use' field changes.
  useEffect(() => {
    if (lastSearch === "") return
    search(lastSearch)
  }, [use])

  const search = async (query: string) => {
    cancelRef.current?.abort()
    cancelRef.current = new AbortController()

    try {
      // Do not perform search if the query is blank.
      if (query === "") {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }))
        return
      }

      // Switch loading state to 'on'.
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }))

      const results = await performSearch(query, use, cancelRef.current?.signal)

      // Update the current query when executed successfully.
      setLastSearch(query)

      // Populate results and switch loading state to 'off'.
      setState((oldState) => ({
        ...oldState,
        isLoading: false,
        results: results || [],
      }))
    } catch (error) {
      if (error instanceof AbortError) return // Ignore abort errors.

      showToast(Toast.Style.Failure, "Could not perform search:", String(error))
    }
  }

  return {
    state,
    search,
  }
}

/**
 * Execute the search request with the given two parameters, the search query
 * and the use-case filter.
 *
 * @param query - the search query
 * @param page - the page number
 * @param use - the use-case filter
 * @param signal - the abort signal used by `fetch`
 */
async function performSearch(query: string, use: Use, signal: AbortSignal) {
  const params = new URLSearchParams({
    q: query,
    license_type: use,
  })
  const path = `/images/?${params.toString()}`
  const data = await apiRequest<ImageResponse>(path, { signal })

  return data.results
}
