import {
  List,
  showToast,
  Toast,
  Icon,
  ActionPanel,
  Action,
  getPreferenceValues,
} from '@raycast/api'
import { useFetch, useCachedState } from '@raycast/utils'
import { useState, useEffect } from 'react'
import { PackageListItem, Preferences } from './PackagListItem'
import { addToHistory, getHistory } from './utils/history-storage'
import { HistoryListItem } from './HistoryListItem'
import { useDebouncedCallback } from 'use-debounce'
import type { NpmFetchResponse } from './npmResponse.model'
import type { HistoryItem } from './utils/history-storage'
import { useFavorites } from './useFavorites'

const API_PATH = 'https://www.npmjs.com/search/suggestions?q='
export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [history, setHistory] = useCachedState<HistoryItem[]>('history', [])
  const [favorites, fetchFavorites] = useFavorites()
  const { showLinkToSearchResultsInListView }: Preferences =
    getPreferenceValues()

  const { isLoading, data, revalidate } = useFetch<NpmFetchResponse>(
    `${API_PATH}${searchTerm.replace(/\s/g, '+')}`,
    {
      execute: !!searchTerm,
      onError: (error) => {
        console.error(error)
        showToast(Toast.Style.Failure, 'Could not fetch packages')
      },
      keepPreviousData: true,
    },
  )

  const debounced = useDebouncedCallback(
    async (value) => {
      const history = await addToHistory({ term: value, type: 'search' })
      setHistory(history)
    },
    600,
    { debounceOnServer: true },
  )

  useEffect(() => {
    if (searchTerm) {
      debounced(searchTerm)
    } else {
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

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "promises"…`}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data?.length ? (
            <>
              {showLinkToSearchResultsInListView ? (
                <List.Item
                  title={`View search results for "${searchTerm}" on npmjs.com`}
                  icon={Icon.MagnifyingGlass}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://www.npmjs.com/search?q=${searchTerm}`}
                        title="View Npm Search Results"
                      />
                    </ActionPanel>
                  }
                />
              ) : null}
              <List.Section title="Results" subtitle={data.length.toString()}>
                {data.map((result) => {
                  return (
                    <PackageListItem
                      key={result.name}
                      result={result}
                      searchTerm={searchTerm}
                      setHistory={setHistory}
                      isFavorited={
                        favorites.findIndex(
                          (item) => item.name === result.name,
                        ) !== -1
                      }
                      handleFaveChange={fetchFavorites}
                    />
                  )
                })}
              </List.Section>
            </>
          ) : null}
        </>
      ) : (
        <>
          {history.length ? (
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
          ) : (
            <List.EmptyView title="Type something to get started" />
          )}
        </>
      )}
    </List>
  )
}
