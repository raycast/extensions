/**
 * Main command to list and manage Kitty terminal tabs
 */

import { useState, useEffect, useMemo } from 'react'
import { showToast, Toast, Form, ActionPanel, Action, LocalStorage } from '@raycast/api'
import TabList from '../components/TabList'
import { listKittyWindows, setTabTitle, setTabColor } from '../utils/kittyAPI'
import {
  handleError,
  validateKittyAvailability,
  validateKittyRemoteControl,
} from '../utils/errorHandler'
import { kittyCache } from '../utils/cache'
import type { KittyPane } from '../types'

type TabFilterType = 'all' | 'claude'

export default function ListTabs() {
  const [tabs, setTabs] = useState<KittyPane[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText] = useState('')
  const [, setError] = useState<string | null>(null)
  const [renamingTabId, setRenamingTabId] = useState<number | null>(null)
  const [settingColorTabId, setSettingColorTabId] = useState<number | null>(null)
  const [filter, setFilter] = useState<TabFilterType>('all')

  // Load saved filter from LocalStorage
  useEffect(() => {
    LocalStorage.getItem<string>('tabFilter').then(savedFilter => {
      if (savedFilter === 'all' || savedFilter === 'claude') {
        setFilter(savedFilter)
      }
    })
  }, [])

  // Save filter to LocalStorage when it changes
  const handleFilterChange = (newFilter: TabFilterType) => {
    setFilter(newFilter)
    LocalStorage.setItem('tabFilter', newFilter)
  }

  const loadTabs = async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true)
      setError(null)

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedTabs = kittyCache.getTabs()
        if (cachedTabs) {
          setTabs(cachedTabs)
          setIsLoading(false)
          return
        }
      }

      // Validate kitty availability
      const isKittyAvailable = await validateKittyAvailability()
      if (!isKittyAvailable) {
        setError('Kitty terminal not found')
        setIsLoading(false)
        return
      }

      // Validate Kitty remote control configuration
      const isRemoteControlReady = await validateKittyRemoteControl()
      if (!isRemoteControlReady) {
        setError('Kitty remote control not configured')
        setIsLoading(false)
        return
      }

      // Get all instances and flatten to tabs
      const instances = await listKittyWindows()

      if (instances.length === 0) {
        setTabs([])
        setIsLoading(false)
        return
      }

      const allTabs = instances.flatMap(instance => instance.tabs.flatMap(window => window.panes))

      // Cache the results
      kittyCache.setTabs(allTabs)

      setTabs(allTabs)

      if (allTabs.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: 'No tabs found',
          message: 'Open a terminal in Kitty to see it here',
        })
      }
    } catch (err) {
      const errorMessage = await handleError({
        operation: 'Load tabs',
        error: err,
      })
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivate = () => {
    // Close the command after successful activation
    // This is handled by the command runtime
  }

  useEffect(() => {
    loadTabs()
  }, [])

  // Handle rename tab
  const handleRename = async (values: { title: string }) => {
    if (!renamingTabId) return

    try {
      await setTabTitle(renamingTabId, values.title)
      await showToast({
        style: Toast.Style.Success,
        title: 'Tab renamed',
        message: values.title,
      })
      setRenamingTabId(null)
      // Clear cache to ensure fresh data on next load
      kittyCache.clearTabs()
      await loadTabs(true) // Refresh
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to rename tab',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Handle set tab color
  const handleSetColor = async (values: { color: string }) => {
    if (!settingColorTabId) return

    try {
      // Define preset colors
      const colorPresets: Record<
        string,
        { activeFg: string; activeBg: string; inactiveFg: string; inactiveBg: string }
      > = {
        red: {
          activeFg: '#ffffff',
          activeBg: '#cc0000',
          inactiveFg: '#000000',
          inactiveBg: '#ffcccc',
        },
        green: {
          activeFg: '#ffffff',
          activeBg: '#00cc00',
          inactiveFg: '#000000',
          inactiveBg: '#ccffcc',
        },
        blue: {
          activeFg: '#ffffff',
          activeBg: '#0066cc',
          inactiveFg: '#000000',
          inactiveBg: '#cce5ff',
        },
        purple: {
          activeFg: '#ffffff',
          activeBg: '#9933cc',
          inactiveFg: '#000000',
          inactiveBg: '#f0d4f5',
        },
        orange: {
          activeFg: '#ffffff',
          activeBg: '#ff6600',
          inactiveFg: '#000000',
          inactiveBg: '#ffe5cc',
        },
        gray: {
          activeFg: '#ffffff',
          activeBg: '#666666',
          inactiveFg: '#000000',
          inactiveBg: '#e0e0e0',
        },
      }

      const colors = colorPresets[values.color]
      if (colors) {
        await setTabColor(
          settingColorTabId,
          colors.activeFg,
          colors.activeBg,
          colors.inactiveFg,
          colors.inactiveBg
        )
        // Store color locally
        kittyCache.setTabColor(settingColorTabId, values.color)
        await showToast({
          style: Toast.Style.Success,
          title: 'Tab color updated',
          message: values.color,
        })
        setSettingColorTabId(null)
        // Clear cache to ensure fresh data on next load
        kittyCache.clearTabs()
        await loadTabs(true) // Refresh
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to set tab color',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Filter tabs based on filter type and search text
  const filteredTabs = useMemo(() => {
    let result = tabs

    // Filter by type (All or Claude)
    if (filter === 'claude') {
      result = result.filter(tab => tab.isClaudeSession)
    }

    // Filter by search text
    if (searchText.trim()) {
      const query = searchText.toLowerCase()
      result = result.filter(
        tab =>
          tab.title.toLowerCase().includes(query) ||
          tab.workingDirectory.toLowerCase().includes(query) ||
          tab.foregroundProcessName?.toLowerCase().includes(query)
      )
    }

    return result
  }, [tabs, filter, searchText])

  // If renaming a tab, show the form
  if (renamingTabId) {
    const tab = tabs.find(t => t.id === renamingTabId)
    if (!tab) {
      setRenamingTabId(null)
      return null
    }

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Rename Tab" onSubmit={handleRename} />
            <Action title="Cancel" onAction={() => setRenamingTabId(null)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="title"
          title="Tab Title"
          placeholder={tab.title || 'Untitled'}
          defaultValue={tab.title}
        />
      </Form>
    )
  }

  // If setting tab color, show the form
  if (settingColorTabId) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Set Color" onSubmit={handleSetColor} />
            <Action title="Cancel" onAction={() => setSettingColorTabId(null)} />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="color" title="Color" defaultValue="gray">
          <Form.Dropdown.Item value="red" title="🔴 Red" />
          <Form.Dropdown.Item value="green" title="🟢 Green" />
          <Form.Dropdown.Item value="blue" title="🔵 Blue" />
          <Form.Dropdown.Item value="purple" title="🟣 Purple" />
          <Form.Dropdown.Item value="orange" title="🟠 Orange" />
          <Form.Dropdown.Item value="gray" title="⚫ Gray" />
        </Form.Dropdown>
      </Form>
    )
  }

  return (
    <TabList
      tabs={filteredTabs}
      isLoading={isLoading}
      onActivate={handleActivate}
      onRename={(tabId: number) => setRenamingTabId(tabId)}
      onSetColor={(tabId: number) => setSettingColorTabId(tabId)}
      filter={filter}
      onFilterChange={handleFilterChange}
    />
  )
}
