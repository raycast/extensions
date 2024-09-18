import { Action, ActionPanel, Color, Icon, List } from '@raycast/api'
import type { Highlight } from './useApi'
import HighlightDetails from './highlightDetails'

type HighlightProps = {
  allHighlights: string
  allUnsyncedHighlights: string
  clearSyncHistory: () => void
  handleCopy: (id: number) => void
  handleCopyAll: () => void
  handleCopyUnsynced: () => void
  highlight: Highlight
  synced?: string
}

export default function Highlight({
  allHighlights,
  allUnsyncedHighlights,
  clearSyncHistory,
  highlight,
  handleCopy,
  handleCopyAll,
  handleCopyUnsynced,
  synced,
}: HighlightProps) {
  return (
    <List.Item
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy All Highlights"
            content={allHighlights}
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
          <Action.CopyToClipboard
            title="Copy All Unsynced Highlights"
            content={allUnsyncedHighlights}
            onCopy={handleCopyUnsynced}
          />
          <Action title="Reset Sync History" onAction={clearSyncHistory} />
        </ActionPanel>
      }
      key={highlight.id}
      title={highlight.text}
      subtitle={highlight.note}
      detail={<HighlightDetails highlight={highlight} syncDate={synced} />}
      accessories={[
        synced
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
