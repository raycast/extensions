import { ActionPanel, Action, List, showToast, Toast } from '@raycast/api'
import { useCallback } from 'react'
import useBookmarkItems from './api/use-bookmark-items'

export default function Command() {
  const handleError = useCallback((err) => {
    console.error('api error', err)

    showToast({
      style: Toast.Style.Failure,
      title: 'Could not perform search',
      message: err.toString(),
    })
  }, [])

  const { isLoading, items } = useBookmarkItems({
    onError: handleError,
  })

  return (
    <List
      enableFiltering
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
    >
      <List.Section title="Bookmarks">
        {items.map((searchResult) => (
          <List.Item
            key={searchResult.id}
            title={searchResult.name}
            subtitle={searchResult.url}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={searchResult.url}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={searchResult.url}
                    shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}
