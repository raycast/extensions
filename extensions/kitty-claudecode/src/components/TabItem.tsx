/**
 * TabItem component - displays a single tab
 */

import { List, showToast, Toast, ActionPanel, Action, closeMainWindow } from '@raycast/api'
import type { KittyPane } from '../types'
import { activateTab, focusWindow } from '../utils/kittyAPI'

interface TabGroup {
  tabId: number
  tabs: KittyPane[]
  title: string
  cwd: string
  isActive: boolean
}

interface TabItemProps {
  tab: KittyPane
  tabGroup?: TabGroup
  onActivate: () => void
  onRename?: (tabId: number) => void
  onSetColor?: (tabId: number) => void
  onTogglePin?: (tabId: number) => void
}

export default function TabItem({ tab, tabGroup, onActivate, onRename, onSetColor }: TabItemProps) {
  const handleActivate = async () => {
    try {
      await activateTab(tab.tabId)
      await closeMainWindow()
      onActivate()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to activate tab',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleFocusWindow = async () => {
    try {
      await focusWindow(tab.windowId)
      await closeMainWindow()
      onActivate()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to focus window',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Get color emoji for display
  const getColorEmoji = (color?: string) => {
    switch (color) {
      case 'red':
        return '🔴'
      case 'green':
        return '🟢'
      case 'blue':
        return '🔵'
      case 'purple':
        return '🟣'
      case 'orange':
        return '🟠'
      case 'gray':
        return '⚫'
      default:
        return ''
    }
  }

  const colorEmoji = getColorEmoji(tab.color)

  // Use tabGroup info if available, otherwise fall back to tab
  const displayTitle = tabGroup?.title || tab.title
  const displayCwd = tabGroup?.cwd || tab.workingDirectory
  const displayProcess =
    tabGroup?.tabs.find(t => t.isActive)?.foregroundProcessName || tab.foregroundProcessName

  // Check if this is a split window (multiple panes in same tab)
  const isSplitWindow = tabGroup && tabGroup.tabs.length > 1
  const paneCount = tabGroup ? tabGroup.tabs.length : 1

  // Use different icons for tab vs pane
  const getIcon = () => {
    if (tab.isActive) {
      return {
        source: {
          light: 'assets/window.png',
          dark: 'assets/window.png',
        },
      }
    }
    if (isSplitWindow) {
      return {
        source: {
          light: 'assets/pane.png',
          dark: 'assets/pane.png',
        },
      }
    }
    return {
      source: {
        light: 'assets/tab.png',
        dark: 'assets/tab.png',
      },
    }
  }

  const icon = getIcon()

  const subtitle = displayProcess
    ? `${displayCwd} • ${displayProcess}${isSplitWindow ? ` • ${paneCount} panes` : ''}`
    : `${displayCwd}${isSplitWindow ? ` • ${paneCount} panes` : ''}`

  return (
    <List.Item
      id={`${tab.windowId}-${tab.windowPaneId || tab.id}`}
      title={`${colorEmoji} ${isSplitWindow ? '→ ' : ''}${displayTitle || 'Untitled'}`}
      subtitle={subtitle}
      icon={icon}
      keywords={[displayCwd, displayProcess || '', displayTitle, isSplitWindow ? 'split' : '']}
      actions={
        <ActionPanel>
          <Action title="Activate Tab" onAction={handleActivate} />
          <Action title="Focus Window" onAction={handleFocusWindow} />
          <Action
            title="Rename Tab"
            onAction={() => onRename?.(tab.tabId)}
            shortcut={{ modifiers: ['cmd'], key: 'r' }}
          />
          <Action
            title="Set Tab Color"
            onAction={() => onSetColor?.(tab.tabId)}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
          />
          <Action.CopyToClipboard title="Copy Working Directory" content={displayCwd} />
          <Action.CopyToClipboard title="Copy Tab Title" content={displayTitle} />
        </ActionPanel>
      }
    />
  )
}
