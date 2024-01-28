import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from '@raycast/api'
import { useState } from 'react'
import urlJoin from 'proper-url-join'
import { useAuth } from './use-auth'
import { useSearch } from './useSearch'
import { useRecents } from './useRecents'
import { Item } from './Item'
import { Unauthorised } from './unauthorised'

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('')
  const authError = useAuth()
  const { bookmarks: recentBookmarks, isLoading: recentIsLoading } =
    useRecents()
  const { bookmarks, isLoading } = useSearch(searchTerm)
  const bookmarksLoading = recentIsLoading || isLoading
  const prefs = getPreferenceValues()

  if (authError) {
    return <Unauthorised authError={authError} />
  }

  return (
    <List
      isLoading={bookmarksLoading}
      searchText={searchTerm}
      searchBarPlaceholder={`Search Otter, like "wordle"…`}
      onSearchTextChange={setSearchTerm}
      throttle
    >
      {searchTerm ? (
        <>
          <List.Item
            title={`View search results for "${searchTerm}" in Otter`}
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={urlJoin(prefs.otterBasePath, 'search', {
                    query: { q: searchTerm },
                  })}
                  title="Open search in Otter"
                />
              </ActionPanel>
            }
          />
          {bookmarks?.length
            ? bookmarks.map((item) => {
                return <Item key={item.id} {...item} />
              })
            : null}
        </>
      ) : (
        <>
          <List.Item
            title={`View latest items in Otter`}
            icon={Icon.Bell}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://otter.zander.wtf/feed`}
                  title="Open latest items in Otter"
                />
              </ActionPanel>
            }
          />
          {recentBookmarks?.length
            ? recentBookmarks.map((item) => {
                return <Item key={item.id} {...item} />
              })
            : null}
        </>
      )}
    </List>
  )
}
