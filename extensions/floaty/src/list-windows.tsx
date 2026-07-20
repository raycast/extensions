import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  Action,
  ActionPanel,
  Icon,
  Image,
  List,
  Toast,
  closeMainWindow,
  showToast,
} from '@raycast/api'
import { runAppleScript } from '@raycast/utils'

import { existsSync } from 'fs'

const LIST_WINDOWS_SCRIPT = 'tell application "Floaty" to list windows json'

type FloatyWindow = {
  appName?: string
  windowTitle?: string
  isPinned?: boolean
  windowId?: number
  index?: number
  displayName?: string
  appIcon?: string
}

async function fetchFloatyWindows(): Promise<FloatyWindow[]> {
  const rawOutput = (await runAppleScript(LIST_WINDOWS_SCRIPT)).trim()
  if (!rawOutput) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawOutput)
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Unable to parse Floaty output: ${error.message}`
        : 'Unable to parse Floaty output'
    )
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Floaty returned unexpected data')
  }

  return parsed as FloatyWindow[]
}

function getAccessories(window: FloatyWindow): List.Item.Accessory[] {
  return window.isPinned
    ? [
        {
          icon: Icon.Checkmark,
          tooltip: 'Pinned',
        },
      ]
    : []
}

function resolveIconSource(appIcon?: string): Image.ImageLike | undefined {
  const trimmedIcon = appIcon?.trim()
  if (!trimmedIcon) {
    return undefined
  }

  if (trimmedIcon.startsWith('data:')) {
    return trimmedIcon
  }

  const base64Pattern = /^[A-Za-z0-9+/=]+$/
  if (trimmedIcon.length > 100 && base64Pattern.test(trimmedIcon)) {
    return `data:image/png;base64,${trimmedIcon}`
  }

  if (trimmedIcon.startsWith('/') || trimmedIcon.startsWith('~')) {
    const resolved = expandPath(trimmedIcon)
    if (!resolved || !existsSync(resolved)) {
      return undefined
    }

    return { source: resolved }
  }

  return trimmedIcon
}

function expandPath(path: string) {
  if (!path.startsWith('~')) {
    return path
  }

  const home = typeof process !== 'undefined' ? process.env.HOME || '' : ''
  return home ? path.replace(/^~(?=\/|$)/, home) : path
}

async function togglePinByIndex(index: number) {
  await runAppleScript(
    `tell application "Floaty" to pin window by index ${index}`
  )
}

type IndexedWindow = {
  window: FloatyWindow
  originalIndex: number
  icon?: Image.ImageLike
}

export default function Command() {
  const [windows, setWindows] = useState<FloatyWindow[] | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  const loadWindows = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(undefined)
    try {
      const result = await fetchFloatyWindows()
      setWindows(result)
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error)
      if (rawMessage.includes('requires a Pro license')) {
        setErrorMessage('Floaty Pro is required to use automation commands.')
      }
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to load windows',
        message: error instanceof Error ? error.message : String(error),
      })
      setWindows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasLoadedRef.current) {
      return
    }

    hasLoadedRef.current = true
    loadWindows()
  }, [loadWindows])

  const items = useMemo(() => {
    if (!windows?.length) {
      return [] as IndexedWindow[]
    }

    return windows.map((window, originalIndex) => ({
      window,
      originalIndex,
      icon: resolveIconSource(window.appIcon),
    }))
  }, [windows])

  const renderWindowItem = ({ window, originalIndex, icon }: IndexedWindow) => {
    const key = String(window.windowId ?? window.index ?? originalIndex)
    const appName = window.appName || 'Unknown app'
    const windowTitle = window.windowTitle || 'Untitled window'
    const customIcon = icon ?? Icon.AppWindow
    const floatyIndex = window.index ?? originalIndex + 1

    const handleToggle = async () => {
      if (!floatyIndex) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Missing window index',
        })
        return
      }

      try {
        await togglePinByIndex(floatyIndex)
        await closeMainWindow({ clearRootSearch: true })
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to update pin status',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return (
      <List.Item
        key={key}
        title={appName}
        subtitle={windowTitle}
        icon={customIcon}
        accessories={getAccessories(window)}
        actions={
          <ActionPanel>
            <Action
              title={window.isPinned ? 'Unpin Window' : 'Pin Window'}
              icon={window.isPinned ? Icon.PinDisabled : Icon.Pin}
              onAction={handleToggle}
            />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search windows">
      {!items.length ? (
        <List.EmptyView
          title={errorMessage ? 'Floaty Pro required' : 'No windows'}
          description={errorMessage ?? 'Floaty did not return any windows'}
          icon={errorMessage ? Icon.Lock : Icon.AppWindow}
        />
      ) : null}

      {items.map((entry) => renderWindowItem(entry))}
    </List>
  )
}
