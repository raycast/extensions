import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api"
import EntryForm from "./views/entry-form"
import Entry, { EntryDTO } from "./models/entry"
import useEntries from "./hooks/use-entries"
import { useEffect, useState } from "react"
import { useEntryStore, useNavigationStore } from "./store"
import EntryListItem from "./components/entry-list-item"

type EntrySorting = "name" | "runCount" | "createdAt"

export type Preferences = {
  noVerifyCommands: boolean
}

const RsyncCommands = () => {
  const [sortBy, setSortBy] = useState<EntrySorting>()
  const [entryFilter, setEntryFilter] = useState<string>("")
  const [pinnedEntries, setPinnedEntries] = useState<Entry[]>([])
  const [otherEntries, setOtherEntries] = useState<Entry[]>([])

  const { entries, entryRunning } = useEntries()
  const selectedEntry = useNavigationStore(state => state.selectedEntry)
  const setEntries = useEntryStore(state => state.setEntries)

  const sortEntries = (a: Entry, b: Entry, sortBy: EntrySorting) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      default:
        return b[sortBy] - a[sortBy]
    }
  }

  useEffect(
    function () {
      if (!sortBy) return
      const filterStr = entryFilter.trim()
      const filteredAndSortedEntries = (
        entryFilter ? entries.filter(e => e.name.toLowerCase().includes(filterStr)) : entries
      ).sort((a, b) => sortEntries(a, b, sortBy))
      setPinnedEntries(filteredAndSortedEntries.filter(e => e.pinned))
      setOtherEntries(filteredAndSortedEntries.filter(e => !e.pinned))
    },
    [entries, sortBy, entryFilter]
  )

  useEffect(
    function () {
      const loadEntries = async () => {
        const entries = await LocalStorage.getItem<string>("entries")
        const rsyncEntries = entries ? JSON.parse(entries).map((e: EntryDTO) => new Entry(e)) : []
        setEntries(rsyncEntries)
      }

      loadEntries()
    },
    [setEntries]
  )

  return (
    <List
      isLoading={entryRunning}
      enableFiltering={false}
      onSearchTextChange={setEntryFilter}
      navigationTitle="Rsync Commands"
      searchBarPlaceholder=""
      selectedItemId={selectedEntry}
      searchBarAccessory={
        <List.Dropdown
          id="sortOrder"
          storeValue={true}
          onChange={value => setSortBy(value as EntrySorting)}
          tooltip="Sort by property"
          defaultValue="name"
        >
          <List.Dropdown.Item key="sortName" title="Name" value="name" />
          <List.Dropdown.Item key="sortRunCount" title="Use Count" value="runCount" />
          <List.Dropdown.Item key="sortHostName" title="Created At" value="createdAt" />
        </List.Dropdown>
      }
    >
      <List.Item
        title="Create new entry..."
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Select" target={<EntryForm />} />
          </ActionPanel>
        }
      />
      <List.Section title="Pinned Entries">
        {pinnedEntries.map(entry => (
          <EntryListItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
      <List.Section title="Entries">
        {otherEntries.map(entry => (
          <EntryListItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
    </List>
  )
}

// noinspection JSUnusedGlobalSymbols
export default RsyncCommands
