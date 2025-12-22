import { Action, ActionPanel, List, closeMainWindow } from '@raycast/api'
import { useState } from 'react'
import { searchPanes, activateTab } from '../utils/kittyAPI'
import { filterAndSortTabs } from '../utils/filtering'
import type { KittyPane } from '../types'

export default function QueryTabs() {
  const [tabs, setTabs] = useState<KittyPane[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  const loadTabs = async () => {
    setIsLoading(true)
    try {
      const allTabs = await searchPanes('')
      setTabs(allTabs)
    } catch (error) {
      console.error('Failed to load tabs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTabs = filterAndSortTabs(tabs, searchText)

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs by title, directory, or process..."
    >
      {filteredTabs.map(tab => (
        <List.Item
          key={`${tab.windowId}-${tab.id}`}
          title={tab.title}
          subtitle={tab.workingDirectory}
          icon="🗂️"
          actions={
            <ActionPanel>
              <Action title="Focus Tab" onAction={() => focusTabAction(tab.id)} />
              <Action.CopyToClipboard title="Copy Directory" content={tab.workingDirectory} />
              <Action.CopyToClipboard title="Copy Title" content={tab.title} />
              <Action
                title="Refresh"
                onAction={loadTabs}
                shortcut={{ modifiers: ['cmd'], key: 'k' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

async function focusTabAction(tabId: number) {
  try {
    await activateTab(tabId)
    await closeMainWindow()
  } catch (error) {
    console.error('Failed to focus tab:', error)
  }
}
