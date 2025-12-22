/**
 * Type definitions for Kitty terminal tabs and windows
 */

export interface KittyPane {
  id: number
  tabId: number // The actual tab ID (from Kitty's tab structure)
  windowPaneId?: number // The individual pane ID within the tab
  title: string
  workingDirectory: string
  pid: number
  windowId: number
  isActive: boolean
  foregroundProcessName?: string
  foregroundProcesses: string[]
  color?: string
  isClaudeSession?: boolean
  isPinned?: boolean
}

export interface KittyTab {
  id: number
  panes: KittyPane[]
  isActive: boolean
  platformWindowId?: number
  title?: string
}

export interface KittyPlatformWindow {
  pid: number
  tabs: KittyTab[]
  title: string
  isActive?: boolean
}

export interface KittyForegroundProcesse {
  pid: number
  cwd: string
  cmdline: string[]
}

export interface ListTabsOptions {
  instanceId?: number
  showInactive?: boolean
}

export interface ActivateTabOptions {
  focusWindow?: boolean
}

export interface KittyAPIResponse {
  success: boolean
  data?: unknown
  error?: string
}

export interface TabSearchResult {
  tab: KittyPane
  matchType: 'title' | 'directory' | 'process'
  matchText: string
}

export interface ClaudeProject {
  id: string // Folder name (e.g., -Users-andyliao-IdeaProjects-gworkflow)
  path: string // Real path (e.g., /Users/andyliao/IdeaProjects/gworkflow)
  displayPath: string // Display path with ~ (e.g., ~/IdeaProjects/gworkflow)
  displayName: string // Project name (e.g., gworkflow)
  sessionCount: number // Number of .jsonl files
  lastModified: Date // Last modification time
  isPinned?: boolean // Whether the project is pinned to top
  pinOrder?: number // Order of pinned items (lower number = higher priority)
}

export interface ClaudeSession {
  id: string // Session ID (filename without .jsonl)
  filePath: string // Full path to .jsonl file
  fileSize: number // File size in bytes
  lastModified: Date // Last modification time
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * History entry from history.jsonl file
 */
export interface HistoryEntry {
  display: string
  pastedContents: unknown
  timestamp: number
  project: string
  sessionId: string
}

/**
 * Processed history entry for display
 */
export interface ProcessedHistoryEntry {
  id: string
  sessionId: string
  display: string
  timestamp: number
  relativeTime: string
  group: 'today' | 'yesterday' | 'pastWeek' | 'older'
}

/**
 * Time grouping configuration
 */
export interface TimeGroup {
  label: string
  entries: ProcessedHistoryEntry[]
}
