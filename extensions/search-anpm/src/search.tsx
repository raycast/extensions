import { useEffect, useState } from 'react'
import { ANpmFetchResponse } from './types/base'
import { useCachedState, useFetch } from '@raycast/utils'
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from '@raycast/api'
import { Preferences } from './types/search'
import { useDebouncedCallback } from 'use-debounce'
import { historyModel } from './model'
import { HistoryItem } from './model/history'
import { HistoryListItem } from './components/HistoryListItem'
import { PackageListItem } from './components/PackageListItem'

const API_PATH = 'https://anpx.alibaba-inc.com/open/search?q='

export default function Search() {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const { showLinkToSearchResultsInListView }: Preferences = getPreferenceValues()
  const [history, setHistory] = useCachedState<HistoryItem[]>('history', [])

  const { isLoading, data, revalidate } = useFetch<ANpmFetchResponse>(
    // 空格需要替换为 + 
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
      const history = await historyModel.addToHistory({ term: value, type: 'search' })
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
      const historyItems = await historyModel.getHistory()
      setHistory(historyItems)
    }
    fetchHistory()
  }, [])

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "@ali/ug-fe-components"…`}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data?.docs?.length ? (
            <>
              {showLinkToSearchResultsInListView ? (
                <List.Item
                  title={`View search results for "${searchTerm}" on anpm.alibaba-inc.com`}
                  icon={Icon.MagnifyingGlass}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://anpm.alibaba-inc.com/package/${searchTerm}`}
                        title="View Anpm Search Results"
                      />
                    </ActionPanel>
                  }
                />
              ) : null}
              <List.Section title="Results" subtitle={data?.docs?.length.toString()}>
                {data?.docs?.map?.((result) => {
                  return (
                    <PackageListItem
                      key={result?.latest?.name}
                      result={result}
                      searchTerm={searchTerm}
                      setHistory={setHistory}
                    />
                  )
                })}
              </List.Section>
            </>
          ) : null}
        </>
      ) : (
        <>
          {history?.length ? (
            // 历史记录
            <List.Section title="History">
              {history?.map?.((item, index) => {
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