import { Action, ActionPanel, List, Icon, getPreferenceValues, showToast, Toast } from '@raycast/api'
import { useFetch } from '@raycast/utils'
import { useState } from 'react'
import axios from 'axios'
import SearchDropdown from './components/SearchDropdown'
import { SearchResponse } from './interfaces/index'
import { searchTypes } from './types/index'

export default function Command() {
  const { serverUrl, apiToken } = getPreferenceValues<{ serverUrl: string; apiToken: string }>()
  const [searchText, setSearchText] = useState('')
  const [searchType, setSearchType] = useState('all')

  let searchUrl = serverUrl

  switch (searchType) {
    case 'all':
      searchUrl = serverUrl + `/api/bookmarks?limit=30&search=${searchText}&sort=-created`
      break
    case 'unread':
      searchUrl = serverUrl + `/api/bookmarks?limit=30&is_archived=false&search=${searchText}&sort=-created`
      break
    case 'archived':
      searchUrl = serverUrl + `/api/bookmarks?limit=30&is_archived=true&search=${searchText}&sort=-created`
      break
    case 'favorite':
      searchUrl = serverUrl + `/api/bookmarks?limit=30&is_marked=true&search=${searchText}&sort=-created`
      break
    default:
      searchUrl = serverUrl + `/api/bookmarks?limit=30&search=${searchText}&sort=-created`
      break
  }

  const { isLoading, data, revalidate } = useFetch<SearchResponse>(searchUrl, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    keepPreviousData: true,
  })

  const dataArray = Array.isArray(data) ? data : []

  const deleteLink = async (id: string) => {
    try {
      await axios.delete(serverUrl + `/api/bookmarks/${id}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      })

      showToast({
        style: Toast.Style.Success,
        title: 'Bookmark deleted successfully',
      })

      revalidate()
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to delete bookmark',
        message: (error as Error).message,
      })
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <SearchDropdown searchTypes={searchTypes} onSearchTypeChange={(type) => setSearchType(type)} />
      }
      throttle
    >
      {dataArray.map((item) => {
        item.href = item.href.replace('/api', '')
        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.description}
            icon={`https://www.google.com/s2/favicons?sz=32&domain_url=${item.url}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={item.href} />
                <Action.OpenInBrowser title="Open the Source Site" url={item.url} />
                <Action.CopyToClipboard title="Copy to Clipboard" content={item.href} />
                <Action
                  title="Delete Bookmark"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => deleteLink(item.id)}
                  shortcut={{ modifiers: ['cmd'], key: 'd' }}
                />
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
