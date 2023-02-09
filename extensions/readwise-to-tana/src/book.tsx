import { List, LocalStorage } from '@raycast/api'
import { useBook, useHighlights } from './useApi'
import Highlight from './highlight'

export default function Book({ id }: { id: string }) {
  const { data: book, isLoading: isLoadingBook } = useBook(id)
  const { data: highlights, isLoading: isLoadingHighlights } = useHighlights(id)

  let allNotes = `%%tana%%
- ${book?.title} #book
  - Author:: ${book?.author} #person\n`

  for (const highlight of highlights?.results || []) {
    if (highlight.note) {
      allNotes += `  - ${highlight.text}
    - **Note:** ${highlight.note}\n`
    } else {
      allNotes += `  - ${highlight.text}\n`
    }
  }

  const handleCopyAll = async () => {
    const ids = highlights?.results.map((highlight) => highlight.id) ?? []

    for (const id of ids) {
      await LocalStorage.setItem(id.toString(), new Date().toISOString())
    }
  }

  const handleCopy = async (id: number) => {
    await LocalStorage.setItem(id.toString(), new Date().toISOString())
  }

  return (
    <List
      navigationTitle={book?.title}
      isLoading={isLoadingBook || isLoadingHighlights}
      isShowingDetail={highlights?.results.length !== 0}
      searchBarPlaceholder="Filter Highlights"
    >
      {highlights?.results.length === 0 ? (
        <List.EmptyView title={`No highlights found for ${book?.title}`} />
      ) : (
        highlights?.results.map((highlight) => (
          <Highlight
            key={highlight.id}
            allNotes={allNotes}
            highlight={highlight}
            handleCopy={handleCopy}
            handleCopyAll={handleCopyAll}
          />
        ))
      )}
    </List>
  )
}
