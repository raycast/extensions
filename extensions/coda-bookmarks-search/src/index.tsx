import { ActionPanel, Action, List, showToast, Toast } from '@raycast/api'
import { useCallback } from 'react'
import useBookmarkItems from './search-bookmarks/use-bookmark-items'

export default function Command() {
  const handleError = useCallback((err) => {
    console.error('api error', err)

    showToast({
      style: Toast.Style.Failure,
      title: 'Could not perform search',
      message: err.toString(),
    })
  }, [])

  const { isLoading, bookmarkItems } = useBookmarkItems({
    onError: handleError,
  })

  return (
    <List
      enableFiltering
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
    >
      <List.Section title="Bookmarks">
        {bookmarkItems.map((bookmarkITem) => (
          <List.Item
            key={bookmarkITem.id}
            title={bookmarkITem.name}
            subtitle={bookmarkITem.url}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={bookmarkITem.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={bookmarkITem.url}
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
