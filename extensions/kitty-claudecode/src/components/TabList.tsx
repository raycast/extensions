/**
 * TabList component - displays all tabs grouped by window
 */

import { List } from '@raycast/api'
import type { KittyPane } from '../types'
import TabItem from './TabItem'

type TabFilterType = 'all' | 'claude'

interface TabListProps {
  tabs: KittyPane[]
  isLoading: boolean
  onActivate: () => void
  onRename?: (tabId: number) => void
  onSetColor?: (tabId: number) => void
  onTogglePin?: (tabId: number) => void
  filter: TabFilterType
  onFilterChange: (value: TabFilterType) => void
}

export default function TabList({
  tabs,
  isLoading,
  onActivate,
  onRename,
  onSetColor,
  filter,
  onFilterChange,
}: TabListProps) {
  // Group tabs by OS window first
  const windows = tabs.reduce(
    (acc, tab) => {
      const windowId = tab.windowId
      if (!acc[windowId]) {
        acc[windowId] = {
          id: windowId,
          tabs: [],
          isActive: tab.isActive,
        }
      }
      acc[windowId].tabs.push(tab)
      return acc
    },
    {} as Record<number, { id: number; tabs: KittyPane[]; isActive: boolean }>
  )

  // Sort windows by active status, then by window ID
  const sortedWindows = Object.values(windows).sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.id - b.id
  })

  // Process each window to show individual panes with tab grouping information
  const processedWindows = sortedWindows.map(window => {
    // Group panes by tab ID to track which panes belong to which tab
    const tabGroups = new Map<
      number,
      { tabId: number; tabs: KittyPane[]; title: string; cwd: string; isActive: boolean }
    >()

    window.tabs.forEach(tab => {
      // Use tabId (the actual Kitty tab ID) as the grouping key
      const tabKey = tab.tabId
      if (!tabGroups.has(tabKey)) {
        tabGroups.set(tabKey, {
          tabId: tab.tabId,
          tabs: [],
          title: tab.title,
          cwd: tab.workingDirectory,
          isActive: tab.isActive,
        })
      }
      tabGroups.get(tabKey)!.tabs.push(tab)
      // Update group properties if any pane is active
      if (tab.isActive) {
        tabGroups.get(tabKey)!.isActive = true
      }
    })

    // Convert to sorted array of grouped tabs
    const groupedTabs = Array.from(tabGroups.values()).sort((a, b) => {
      // Sort by active status first
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1

      // Then by tab ID
      return a.tabId - b.tabId
    })

    // Flatten to show all panes individually but track which tab they belong to
    const allPanesWithTabInfo = groupedTabs.flatMap(tabGroup =>
      tabGroup.tabs.map(pane => ({
        pane,
        tabGroup,
      }))
    )

    return {
      ...window,
      tabGroups,
      panes: allPanesWithTabInfo,
    }
  })

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Tabs"
          value={filter}
          onChange={newValue => onFilterChange(newValue as TabFilterType)}
        >
          <List.Dropdown.Item title="All Tabs" value="all" />
          <List.Dropdown.Item title="Claude Code" value="claude" />
        </List.Dropdown>
      }
    >
      {processedWindows.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No tabs found"
          description="Make sure Kitty terminal is running"
          icon="🔍"
        />
      ) : (
        processedWindows.map(window => (
          <List.Section
            key={window.id}
            title={`Window ${window.id}`}
            subtitle={`${window.tabGroups.size} tab${window.tabGroups.size !== 1 ? 's' : ''}, ${window.panes.length} pane${
              window.panes.length !== 1 ? 's' : ''
            }${window.isActive ? ' • Active' : ''}`}
          >
            {window.panes.map(({ pane, tabGroup }, paneIndex) => (
              <TabItem
                key={`${window.id}-${pane.windowPaneId || pane.id}-${paneIndex}`}
                tab={pane}
                tabGroup={tabGroup}
                onActivate={onActivate}
                onRename={onRename}
                onSetColor={onSetColor}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  )
}
