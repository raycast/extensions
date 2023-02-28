import { List, LocalStorage } from '@raycast/api'
import { useBook, useHighlights } from './useApi'
import Highlight from './highlight'
import React from 'react'
import Handlebars from 'handlebars'
import { formatDate } from './utils'

type BookProps = {
  id: string
  template: string
}

export default function Book({ id, template }: BookProps) {
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

  if (!book) {
    return (
      <List>
        <List.EmptyView title="No information found" />
      </List>
    )
  }

  let allUnsyncedHighlights = '%%tana%%\n'

  for (const highlight of highlights) {
    if (!syncedItems[highlight.id.toString()]) {
      if (highlight.note) {
        allUnsyncedHighlights += `- ${highlight.text}
  - **Note:** ${highlight.note}\n`
      } else {
        allUnsyncedHighlights += `- ${highlight.text}\n`
      }
    }
  }

  const h = Handlebars.compile(template)
  const allHighlights = h({
    ...book,
    highlights: highlights.map((highlight) => ({
      ...highlight,
      updated: formatDate(highlight.updated),
      highlighted_at: formatDate(highlight.highlighted_at),
    })),
  })

  const handleCopyAll = async () => {
    const currentTime = new Date().toISOString()
    const ids = highlights.map(({ id }) => id)

    for (const id of ids) {
      await LocalStorage.setItem(id.toString(), currentTime)
    }

    setLastSynced(currentTime)
  }

  const handleCopyUnsynced = async () => {
    const currentTime = new Date().toISOString()
    const ids = highlights
      .map(({ id }) => id)
      .filter((id) => !syncedItems[id.toString()])

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
            allHighlights={allHighlights}
            allUnsyncedHighlights={allUnsyncedHighlights}
            highlight={highlight}
            handleCopyAll={handleCopyAll}
            handleCopyUnsynced={handleCopyUnsynced}
            handleCopy={handleCopy}
            synced={syncedItems[highlight.id.toString()]}
          />
        ))
      )}
    </List>
  )
}
