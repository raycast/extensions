import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { HistoryEntry, ProcessedHistoryEntry } from '../types'
import { getProjectFolderPath } from './claudeJson'

const HISTORY_FILE_PATH = '/Users/andyliao/.claude/history.jsonl'
const DEFAULT_LIMIT = 1000

/**
 * Read and parse history.jsonl file
 * @param projectPath - Current project path to filter by
 * @param limit - Maximum number of entries to read (default: 1000)
 * @returns Array of processed history entries
 */
export function readHistoryFile(
  projectPath: string,
  limit: number = DEFAULT_LIMIT
): ProcessedHistoryEntry[] {
  if (!existsSync(HISTORY_FILE_PATH)) {
    return []
  }

  try {
    const content = readFileSync(HISTORY_FILE_PATH, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    // Read up to 'limit' lines from the end (reverse order)
    const recentLines = lines.slice(-limit)

    // Use Map to deduplicate by sessionId, keeping the latest (first encountered in reverse order)
    const sessionMap = new Map<string, HistoryEntry>()

    // Parse each line in reverse order (newest first)
    for (const line of recentLines) {
      try {
        const entry = JSON.parse(line) as HistoryEntry

        // Filter: must have project matching current project and a sessionId
        if (entry.project === projectPath && entry.sessionId) {
          // Only add if sessionId not seen yet (keeps the latest/first encountered in reverse order)
          if (!sessionMap.has(entry.sessionId)) {
            sessionMap.set(entry.sessionId, entry)
          }
        }
      } catch {
        // Skip invalid JSON lines
        continue
      }
    }

    // Convert Map values to array and sort by timestamp descending
    const entries = Array.from(sessionMap.values()).sort((a, b) => b.timestamp - a.timestamp)

    // Process entries for display
    return entries.map(processHistoryEntry)
  } catch {
    return []
  }
}

/**
 * Process a history entry for display
 * @param entry - Raw history entry
 * @returns Processed entry with display name and time formatting
 */
function processHistoryEntry(entry: HistoryEntry): ProcessedHistoryEntry {
  // Try to get display from session summary first
  let display = getDisplayFromSessionSummary(entry.project, entry.sessionId)

  // Fallback to history entry display if no summary found
  if (!display) {
    display = entry.display
    // Handle /rename <display> format
    if (display.startsWith('/rename ')) {
      display = display.substring('/rename '.length).trim()
    }
  }

  // Create unique ID from sessionId and timestamp
  const id = `${entry.sessionId}-${entry.timestamp}`

  return {
    id,
    sessionId: entry.sessionId,
    display,
    timestamp: entry.timestamp,
    relativeTime: formatRelativeTime(entry.timestamp),
    group: getTimeGroup(entry.timestamp),
  }
}

/**
 * Get display name from session summary
 * @param projectPath - Project path
 * @param sessionId - Session ID
 * @returns Summary string or null if not found
 */
function getDisplayFromSessionSummary(projectPath: string, sessionId: string): string | null {
  try {
    // Get project folder path
    const folderPath = getProjectFolderPath(projectPath)

    // Check if folder exists
    if (!existsSync(folderPath)) {
      return null
    }

    // Construct session file path
    const sessionFilePath = join(folderPath, `${sessionId}.jsonl`)

    // Check if session file exists
    if (!existsSync(sessionFilePath)) {
      return null
    }

    // Read session file
    const content = readFileSync(sessionFilePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    // Find first record with type="summary"
    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.type === 'summary' && json.summary) {
          return json.summary
        }
      } catch {
        // Skip invalid JSON lines
        continue
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Format timestamp as relative time (e.g., "now", "1m", "3h", "3d")
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`
  } else if (diffHours < 24) {
    return `${diffHours}h`
  } else if (diffDays < 7) {
    return `${diffDays}d`
  } else {
    return formatDate(timestamp)
  }
}

/**
 * Get time group for an entry
 * @param timestamp - Timestamp in milliseconds
 * @returns Time group category
 */
function getTimeGroup(timestamp: number): ProcessedHistoryEntry['group'] {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return 'pastWeek'
  } else {
    return 'older'
  }
}

/**
 * Format date for older entries
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted date string
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}
