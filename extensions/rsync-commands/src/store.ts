import create from "zustand"
import Entry from "./models/entry"

interface NavigationStore {
  selectedEntry: string | undefined
  setSelectedEntry: (id: string | undefined) => void
}

const useNavigationStore = create<NavigationStore>(set => ({
  selectedEntry: undefined,
  setSelectedEntry: (id: string | undefined) => set({ selectedEntry: id }),
}))

interface EntryStore {
  entries: Entry[]
  setEntries: (entries: Entry[]) => void
}

const useEntryStore = create<EntryStore>(set => ({
  entries: [],
  setEntries: (entries: Entry[]) => set({ entries }),
}))

export { useNavigationStore, useEntryStore }
