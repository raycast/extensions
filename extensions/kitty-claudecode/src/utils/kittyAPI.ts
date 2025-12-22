/**
 * Kitty API utility functions for interacting with Kitty terminal
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import type { KittyPane, KittyPlatformWindow, KittyTab } from '../types'
import { kittyCache } from './cache'
import { closeMainWindow } from '@raycast/api'

const execFileAsync = promisify(execFile)

// Cache for the kitty executable path
let cachedKittyPath: string | null = null

/**
 * Get the cached kitty executable path, checking common locations if not cached
 */
export const getKittyExecutablePath = (): string | null => {
  if (cachedKittyPath) {
    return cachedKittyPath
  }

  const commonKittyPaths = [
    '/usr/local/bin/kitty',
    '/opt/homebrew/bin/kitty',
    '/Applications/kitty.app/Contents/MacOS/kitty',
    'kitty',
  ]

  // Note: This is a synchronous check for performance
  // The actual validation happens in checkKittyAvailability
  return commonKittyPaths[1] || null // Default to /opt/homebrew/bin/kitty for macOS
}

/**
 * Check if kitty is available on the system
 */
export const checkKittyAvailability = async (): Promise<boolean> => {
  try {
    // Check multiple common locations for kitty
    // Raycast extensions run with a restricted PATH
    const commonKittyPaths = [
      '/usr/local/bin/kitty',
      '/opt/homebrew/bin/kitty',
      '/Applications/kitty.app/Contents/MacOS/kitty',
      'kitty', // Try just 'kitty' in case it's in PATH
    ]

    for (const kittyPath of commonKittyPaths) {
      try {
        await execFileAsync(kittyPath, ['--version'], { timeout: 2000 })
        console.log(`Found kitty at: ${kittyPath}`)
        cachedKittyPath = kittyPath
        return true
      } catch {
        // Try next path
      }
    }

    return false
  } catch (error) {
    console.log('Kitty availability check failed:', error)
    return false
  }
}

/**
 * Get the actual socket path that Kitty is listening on
 */
export const getActualSocketPath = async (): Promise<string | null> => {
  try {
    // Try to find socket files in /tmp matching the pattern
    const { readdir } = await import('fs/promises')
    const files = await readdir('/tmp')
    const socketFile = files.find(f => f.startsWith('mykitty-'))

    if (socketFile) {
      console.log(`Found socket file: /tmp/${socketFile}`)
      return `/tmp/${socketFile}`
    }

    return null
  } catch (error) {
    console.log('Failed to find socket file:', error)
    return null
  }
}

/**
 * Get the default kitty socket path
 */
export const getDefaultSocketPath = (): string => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp'
  return `${homeDir}/.local/share/kitty/kitty-socket`
}

/**
 * Get kitty socket path from environment or default
 */
export const getKittySocketPath = (): string => {
  return process.env.KITTY_SOCKET_PATH || getDefaultSocketPath()
}

/**
 * Parse kitty @ ls JSON output to extract window and tab information
 */
const parseKittyListOutput = (output: string): KittyPlatformWindow[] => {
  try {
    const data = JSON.parse(output)

    // Kitty @ ls returns an array of windows
    const windows = Array.isArray(data) ? data : [data]

    // Group windows by their OS window (kitty instance)
    const platformWindowsMap = new Map<number, KittyPlatformWindow>()

    for (const window of windows) {
      const platformWindowId = window.platform_window_id || 1 // Default to 1 if no platform ID

      if (!platformWindowsMap.has(platformWindowId)) {
        platformWindowsMap.set(platformWindowId, {
          pid: platformWindowId,
          title: `Kitty Plantform Window ${platformWindowId}`,
          tabs: [],
        })
      }

      const platformWindow = platformWindowsMap.get(platformWindowId)!

      // Process tabs in this window
      if (window.tabs && Array.isArray(window.tabs)) {
        for (const tab of window.tabs) {
          const tabObj: KittyTab = {
            id: tab.id,
            panes: [],
            isActive: tab.is_active || false,
            platformWindowId: window.platform_window_id,
            title: tab.title,
          }

          // Iterate through all panes in this tab
          for (const pane of tab.windows || []) {
            // Check if any foreground process is Claude Code
            // Only match the executable name (first element of cmdline), not paths
            const isClaudeSession =
              pane.foreground_processes?.some((proc: { cmdline?: string[] }) => {
                const executable = proc.cmdline?.[0]
                // Use basename to avoid matching paths that contain 'claude'
                const executableName = executable?.split('/').pop() || ''
                return executableName.toLowerCase().includes('claude')
              }) ?? false

            // Get working directory from the first foreground process (current session)
            // foreground_processes is ordered from newest to oldest, so index 0 is the current process
            // This is more accurate than pane.cwd which is set at pane creation time
            const currentProcess = pane.foreground_processes?.[0]
            const workingDirectory = currentProcess?.cwd || pane.cwd || ''

            const paneObj: KittyPane = {
              id: pane.id, // Use windowPane ID as unique identifier for this pane
              tabId: tab.id, // Store the actual tab ID for grouping
              windowPaneId: pane.id, // Store windowPane ID separately
              title: pane.title || tab.title || 'Untitled',
              workingDirectory,
              pid: pane.pid,
              windowId: window.id, // Use the OS window ID from JSON
              isActive: pane.is_active || false,
              foregroundProcesses: pane.foreground_processes,
              foregroundProcessName: pane.foreground_processes?.[0]?.cmdline?.[0],
              // Get color from cache if available (use tab.id for color lookup)
              color: kittyCache.getTabColor(tab.id),
              isClaudeSession,
            }

            tabObj.panes.push(paneObj)
          }

          platformWindow.tabs.push(tabObj)
        }
      }
    }

    return Array.from(platformWindowsMap.values())
  } catch (error) {
    console.error('Failed to parse kitty list output:', error)
    return []
  }
}

/**
 * List all kitty instances and their tabs using kitten @
 */
export const listKittyWindows = async (): Promise<KittyPlatformWindow[]> => {
  try {
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    // Try to get the actual socket path
    const actualSocketPath = await getActualSocketPath()

    // Set environment to use socket-based remote control instead of TTY
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    const { stdout } = await execFileAsync(kittyPath, ['@', 'ls'], {
      timeout: 5000,
      env,
    })

    return parseKittyListOutput(stdout)
  } catch (error) {
    console.error('Failed to list kitty instances:', error)
    throw new Error(
      `Failed to list kitty instances: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Get active kitty instance (the one with active windows)
 */
export const getActiveWindow = async (): Promise<KittyPlatformWindow | null> => {
  try {
    const instances = await listKittyWindows()
    return instances.find(inst => inst.tabs.some(win => win.isActive)) || null
  } catch (error) {
    console.error('Failed to get active instance:', error)
    return null
  }
}

/**
 * Activate a specific tab
 */
export const activateTab = async (tabId: number): Promise<void> => {
  try {
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    // Try to get the actual socket path
    const actualSocketPath = await getActualSocketPath()

    // Set environment to use socket-based remote control instead of TTY
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    const args = ['@', 'focus-tab', '--match', `id:${tabId}`]

    await execFileAsync(kittyPath, args, {
      timeout: 5000,
      env,
    })
  } catch (error) {
    console.error('Failed to activate tab:', error)
    throw new Error(
      `Failed to activate tab (id ${tabId}): ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

/**
 * Focus a specific window
 */
export const focusWindow = async (windowId: number): Promise<void> => {
  try {
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    // Try to get the actual socket path
    const actualSocketPath = await getActualSocketPath()

    // Set environment to use socket-based remote control instead of TTY
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    await execFileAsync(kittyPath, ['@', 'focus-window', '--match', `id:${windowId}`], {
      timeout: 5000,
      env,
    })
  } catch (error) {
    console.error('Failed to focus window:', error)
    throw new Error(
      `Failed to focus window ${windowId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

/**
 * Search panes by query
 */
export const searchPanes = async (query: string): Promise<KittyPane[]> => {
  try {
    const windows = await listKittyWindows()
    const panes = windows.flatMap(instance => instance.tabs.flatMap(window => window.panes))

    if (!query.trim()) {
      return panes
    }

    const lowerQuery = query.toLowerCase()
    return panes.filter(
      tab =>
        tab.title.toLowerCase().includes(lowerQuery) ||
        tab.workingDirectory.toLowerCase().includes(lowerQuery) ||
        tab.foregroundProcessName?.toLowerCase().includes(lowerQuery)
    )
  } catch (error) {
    console.error('Failed to search tabs:', error)
    throw error
  }
}

/**
 * Set tab title
 */
export const setTabTitle = async (tabId: number, title: string): Promise<void> => {
  try {
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    // Try to get the actual socket path
    const actualSocketPath = await getActualSocketPath()

    // Set environment to use socket-based remote control instead of TTY
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    const args = ['@', 'set-tab-title', '--match', `id:${tabId}`, title]

    await execFileAsync(kittyPath, args, {
      timeout: 5000,
      env,
    })
  } catch (error) {
    console.error('Failed to set tab title:', error)
    throw new Error(
      `Failed to set tab title: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Set tab color
 */
export const setTabColor = async (
  tabId: number,
  activeFg: string,
  activeBg: string,
  inactiveFg: string,
  inactiveBg: string
): Promise<void> => {
  try {
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    // Try to get the actual socket path
    const actualSocketPath = await getActualSocketPath()

    // Set environment to use socket-based remote control instead of TTY
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    const args = [
      '@',
      'set-tab-color',
      '--match',
      `id:${tabId}`,
      `active_fg=${activeFg}`,
      `active_bg=${activeBg}`,
      `inactive_fg=${inactiveFg}`,
      `inactive_bg=${inactiveBg}`,
    ]

    await execFileAsync(kittyPath, args, {
      timeout: 5000,
      env,
    })
  } catch (error) {
    console.error('Failed to set tab color:', error)
    throw new Error(
      `Failed to set tab color: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Count total number of panes across all instances
 */
export const getTotalPaneCount = async (): Promise<number> => {
  try {
    const windows = await listKittyWindows()
    return windows.reduce((total, instance) => {
      return (
        total +
        instance.tabs.reduce((winTotal, window) => {
          return winTotal + window.panes.length
        }, 0)
      )
    }, 0)
  } catch (error) {
    console.error('Failed to get total tab count:', error)
    return 0
  }
}

/**
 * Smart open project in Kitty
 * - If a tab with matching cwd exists, focus it
 * - Otherwise, create a new tab
 */
export const openProjectInKitty = async (projectPath: string): Promise<void> => {
  try {
    // Get all tabs
    const windows = await listKittyWindows()
    const panes = windows.flatMap(inst => inst.tabs.flatMap(win => win.panes))

    // Find tab with matching working directory
    const matchingPane = panes.find(
      tab =>
        tab.workingDirectory === projectPath || tab.workingDirectory.startsWith(projectPath + '/')
    )

    if (matchingPane) {
      console.debug(
        `matchingPane: windowPaneId: ${matchingPane.windowPaneId}, matchingTabId: ${matchingPane.id}`
      )
      // Focus existing tab
      await focusWindow(matchingPane.windowPaneId || matchingPane.id)
      return
    }

    // Create new tab
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    const actualSocketPath = await getActualSocketPath()
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    await execFileAsync(kittyPath, ['@', 'launch', '--type=tab', '--cwd', projectPath], {
      timeout: 5000,
      env,
    })
  } catch (error) {
    console.error('Failed to open project in Kitty:', error)
    throw new Error(
      `Failed to open project in Kitty: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Open Claude session in new Kitty tab
 * Creates a new tab and runs: claude -r <session-id>
 */
export const openClaudeSession = async (projectPath: string, sessionId: string): Promise<void> => {
  try {
    const kittyPath = getKittyExecutablePath()
    if (!kittyPath) {
      throw new Error('Kitty executable not found')
    }

    const actualSocketPath = await getActualSocketPath()
    const env = {
      ...process.env,
      ...(actualSocketPath ? { KITTY_LISTEN_ON: `unix:${actualSocketPath}` } : {}),
    }

    // Launch new tab with command to resume Claude session
    await execFileAsync(kittyPath, ['@', 'launch', '--type=tab', '--cwd', projectPath], {
      timeout: 5000,
      env,
    })

    // Wait a bit for the tab to be ready, then send the command
    // Note: This is a simple approach; for more reliability, we might need to
    // use Kitty's @ send-text command
    setTimeout(async () => {
      try {
        await execFileAsync(
          kittyPath,
          [
            '@',
            'send-text',
            '--match',
            'recent:1', // Target the most recently launched tab
            `claude -r ${sessionId}`,
          ],
          {
            timeout: 5000,
            env,
          }
        )
        closeMainWindow()
      } catch (err) {
        console.error('Failed to send claude command:', err)
      }
    }, 2000)
  } catch (error) {
    console.error('Failed to open Claude session in Kitty:', error)
    throw new Error(
      `Failed to open Claude session: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
