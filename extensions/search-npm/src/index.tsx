import { List, showToast, Toast } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { useState, useEffect, useCallback } from 'react'
import { PackageListItem } from './PackagListItem'
import { addToHistory, getHistory } from './utils/history-storage'
import { HistoryListItem } from './HistoryListItem'
import { useDebounce } from 'use-debounce'
import type { NpmFetchResponse, Package } from './npmResponse.model'
import type { HistoryItem } from './utils/history-storage'
import { getFaves } from './utils/favorite-storage'

const API_PATH = 'https://www.npmjs.com/search/suggestions?q='
export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchText] = useDebounce(searchTerm, 300)
  const [debouncedSearchTextForHistory] = useDebounce(searchTerm, 600)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [faves, setFaves] = useState<Package[]>([])

  const { isLoading, data, revalidate } = useFetch<NpmFetchResponse>(
    `${API_PATH}${debouncedSearchText.replace(/\s/g, '+')}`,
    {
      execute: !!debouncedSearchText,
      onError: (error) => {
        console.error(error)
        showToast(Toast.Style.Failure, 'Could not fetch packages')
      },
      keepPreviousData: true,
    },
  )

  const setHistorySearchItem = useCallback(async (text: string) => {
    const history = await addToHistory({ term: text, type: 'search' })
    setHistory(history)
  }, [])

  useEffect(() => {
    if (debouncedSearchTextForHistory) {
      setHistorySearchItem(debouncedSearchTextForHistory)
    }
  }, [debouncedSearchTextForHistory])

  useEffect(() => {
    if (!searchTerm) {
      revalidate()
    }
  }, [searchTerm])

  useEffect(() => {
    async function fetchHistory() {
      const historyItems = await getHistory()
      setHistory(historyItems)
    }
    fetchHistory()
  }, [])

  useEffect(() => {
    async function fetchFaves() {
      const faveItems = await getFaves()
      setFaves(faveItems)
    }
    fetchFaves()
  }, [])

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "promises"…`}
      onSearchTextChange={setSearchTerm}
    >
      {data?.length ? (
        <List.Section title="Results" subtitle={data.length.toString()}>
          {data.map((result) => {
            return (
              <PackageListItem
                key={result.name}
                result={result}
                searchTerm={searchTerm}
                setHistory={setHistory}
                isFaved={
                  faves.findIndex((item) => item.name === result.name) !== -1
                }
              />
            )
          })}
        </List.Section>
      ) : (
        <List.Section title="History">
          {history.map((item, index) => {
            return (
              <HistoryListItem
                key={`${item.term}-${item.type}-${index}`}
                item={item}
                setHistory={setHistory}
                setSearchTerm={setSearchTerm}
              />
            )
          })}
        </List.Section>
      )}
    </List>
  )
}
