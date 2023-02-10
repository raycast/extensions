import {
  Action,
  LocalStorage,
  ActionPanel,
  Color,
  Icon,
  List,
} from '@raycast/api'
import type { Highlight } from './useApi'
import HighlightDetails from './highlightDetails'
import React from 'react'

type HighlightProps = {
  allNotes: string
  handleCopyAll: () => void
  highlight: Highlight
}

export default function Highlight({
  allNotes,
  highlight,
  handleCopyAll,
}: HighlightProps) {
  const [syncDate, setSyncDate] = React.useState<string>()

  React.useEffect(() => {
    const getItem = async () => {
      const item = await LocalStorage.getItem<string>(highlight.id.toString())

      setSyncDate(item)
    }

    getItem()
  }, [])

  const handleCopy = async (id: number) => {
    await LocalStorage.setItem(id.toString(), new Date().toISOString())
    const item = await LocalStorage.getItem<string>(highlight.id.toString())

    setSyncDate(item)
  }

  return (
    <List.Item
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy All Highlights"
            content={allNotes}
            onCopy={handleCopyAll}
          />
          <Action.CopyToClipboard
            title="Copy This Highlight"
            content={
              highlight.note
                ? `%%tana%%
- ${highlight.text}
  - **Note:** ${highlight.note}`
                : highlight.text
            }
            onCopy={() => handleCopy(highlight.id)}
          />
        </ActionPanel>
      }
      key={highlight.id}
      title={highlight.text}
      subtitle={highlight.note}
      detail={<HighlightDetails highlight={highlight} syncDate={syncDate} />}
      accessories={[
        syncDate
          ? {
              icon: {
                tintColor: Color.Green,
                source: Icon.Checkmark,
              },
              tooltip: 'Synced',
            }
          : {
              icon: Icon.Checkmark,
              tooltip: 'Not synced',
            },
      ]}
    />
  )
}
