import { List, LocalStorage } from '@raycast/api'
import { useBook, useHighlights } from './useApi'
import Highlight from './highlight'
import React from 'react'

export default function Book({ id }: { id: string }) {
  const { data: book, isLoading: isLoadingBook } = useBook(id)
  const { highlights, isLoading: isLoadingHighlights } = useHighlights(id)
  const [lastSynced, setLastSynced] = React.useState<string | null>(null)
  const [syncedItems, setSyncedItems] = React.useState<LocalStorage.Values>({})

  React.useEffect(() => {
    const getSyncedItems = async () => {
      const itemsInStorage = await LocalStorage.allItems()

      setSyncedItems(itemsInStorage)
    }

    getSyncedItems()
  }, [lastSynced])

  let allNotes = `%%tana%%
- ${book?.title} #book
  - Author:: ${book?.author} #person\n`

  for (const highlight of highlights) {
    if (highlight.note) {
      allNotes += `  - ${highlight.text}
    - **Note:** ${highlight.note}\n`
    } else {
      allNotes += `  - ${highlight.text}\n`
    }
  }

  const handleCopyAll = async () => {
    const currentTime = new Date().toISOString()
    const ids = highlights.map(({ id }) => id)

    for (const id of ids) {
      await LocalStorage.setItem(id.toString(), currentTime)
    }

    setLastSynced(currentTime)
  }

  const handleCopy = async (id: number) => {
    const currentTime = new Date().toISOString()

    await LocalStorage.setItem(id.toString(), currentTime)
    setLastSynced(currentTime)
  }

  return (
    <List
      navigationTitle={book?.title}
      isLoading={isLoadingBook || isLoadingHighlights}
      isShowingDetail={highlights.length !== 0}
      searchBarPlaceholder="Filter Highlights"
    >
      {highlights.length === 0 ? (
        <List.EmptyView title={`No highlights found for ${book?.title}`} />
      ) : (
        highlights.map((highlight) => (
          <Highlight
            key={highlight.id}
            allNotes={allNotes}
            highlight={highlight}
            handleCopyAll={handleCopyAll}
            handleCopy={handleCopy}
            synced={syncedItems[highlight.id.toString()]}
          />
        ))
      )}
    </List>
  )
}
