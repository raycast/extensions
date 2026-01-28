import { FC, useCallback } from "react"
import { Action, ActionPanel, Icon, List } from "@raycast/api"
import EntryForm from "../views/entry-form"
import useEntries from "../hooks/use-entries"
import Entry from "../models/entry"
import { useNavigationStore } from "../store"
import EntryPreview from "../views/entry-preview"

type EntryListItemProps = {
  entry: Entry
}

const EntryListItem: FC<EntryListItemProps> = ({ entry }) => {
  const { deleteEntry, updateEntry, runEntry, copyEntryCommand } = useEntries()
  const setSelectedEntry = useNavigationStore(state => state.setSelectedEntry)

  const toggleEntryPin = useCallback(
    async (entry: Entry) => {
      const clone = entry.clone()
      clone.pinned = !entry.pinned
      await updateEntry(clone, false, true)
      setSelectedEntry(clone.id)
    },
    [setSelectedEntry, updateEntry]
  )

  return (
    <List.Item
      id={entry.id}
      key={entry.id}
      title={entry.name}
      accessories={[
        { text: entry.description },
        {
          icon: Icon.LevelMeter,
          tooltip: `Used ${entry.runCount} time${entry.runCount !== 1 ? "s" : ""}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Run" onAction={() => runEntry(entry)} />
          <Action.Push title="Edit" target={<EntryForm source={entry} />} />
          <Action
            title="Delete"
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={() => deleteEntry(entry)}
          />
          <Action.Push
            title="Duplicate"
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            target={<EntryForm source={entry.duplicate()} />}
          />
          <Action
            title="Copy to Clipboard"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => copyEntryCommand(entry)}
          />
          <Action.Push
            title="Preview"
            target={<EntryPreview entry={entry} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action
            title={entry.pinned ? "Unpin" : "Pin"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => toggleEntryPin(entry)}
          />
        </ActionPanel>
      }
    />
  )
}

export default EntryListItem
