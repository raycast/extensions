/**
 * Claude Projects utility functions
 */

import { readdir, stat, readFile, access } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import type { ClaudeProject, ClaudeSession, ConversationMessage } from '../types'
import { parseClaudeJsonProjects, getProjectFolderPath } from './claudeJson'

/**
 * Check if a path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Convert path to display path with ~
 */
function toDisplayPath(path: string): string {
  const home = homedir()
  if (path.startsWith(home)) {
    return path.replace(home, '~')
  }
  return path
}

/**
 * Get project name from path
 */
function getProjectName(path: string): string {
  return basename(path)
}

/**
 * List all Claude projects
 */
export async function listClaudeProjects(): Promise<ClaudeProject[]> {
  try {
    // Parse .claude.json to get project list
    const jsonProjects = await parseClaudeJsonProjects()

    const projects: ClaudeProject[] = []

    // Process each project from .claude.json
    for (const [projectPath] of Object.entries(jsonProjects)) {
      // Get the folder path for this project
      const folderPath = getProjectFolderPath(projectPath)

      // Check if the folder exists
      if (!(await pathExists(folderPath))) {
        console.debug(`${folderPath} has none session files`)
        continue // Skip projects without session files
      }

      // Count .jsonl files
      const files = await readdir(folderPath)
      const sessionCount = files.filter(f => f.endsWith('.jsonl')).length

      // Skip projects with no sessions
      if (sessionCount === 0) {
        continue
      }

      // Get last modified time from folder
      const folderStat = await stat(folderPath)

      projects.push({
        id: projectPath, // Use the actual path as ID
        path: projectPath,
        displayPath: toDisplayPath(projectPath),
        displayName: getProjectName(projectPath),
        sessionCount,
        lastModified: folderStat.mtime,
      })
    }

    // Sort by last modified (newest first)
    projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

    return projects
  } catch (error) {
    console.error('Failed to list Claude projects:', error)
    return []
  }
}

/**
 * List sessions for a project
 */
export async function listProjectSessions(projectId: string): Promise<ClaudeSession[]> {
  try {
    // Convert project path to folder path
    const projectPath = getProjectFolderPath(projectId)
    const files = await readdir(projectPath)

    const sessions: ClaudeSession[] = []

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue

      const filePath = join(projectPath, file)
      const fileStat = await stat(filePath)

      sessions.push({
        id: file.replace('.jsonl', ''),
        filePath,
        fileSize: fileStat.size,
        lastModified: fileStat.mtime,
      })
    }

    // Sort by last modified (newest first)
    sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

    return sessions
  } catch (error) {
    console.error('Failed to list project sessions:', error)
    return []
  }
}

/**
 * Parse session file and extract conversation messages
 */
export async function parseSessionContent(
  filePath: string,
  maxMessages: number = 20
): Promise<ConversationMessage[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n')

    const messages: ConversationMessage[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const json = JSON.parse(line)

        // Skip non-message types
        if (json.type !== 'user' && json.type !== 'assistant') {
          continue
        }

        const role = json.type
        let messageContent = ''

        // Extract content from message
        if (json.message) {
          if (json.message.content) {
            if (typeof json.message.content === 'string') {
              // Simple string content (user messages)
              messageContent = json.message.content
            } else if (Array.isArray(json.message.content)) {
              // Array of content blocks (assistant messages)
              messageContent = json.message.content
                .map(block => {
                  if (block.type === 'text' && block.text) {
                    return block.text
                  } else if (block.type === 'thinking' && block.thinking) {
                    return `*${block.thinking}*`
                  } else if (block.type === 'tool_use' && block.name) {
                    return `\`\`\`\nTool: ${block.name}\n\`\`\``
                  } else if (block.type === 'tool_result' && block.content) {
                    return `\`\`\`\n${block.content}\n\`\`\``
                  }
                  return ''
                })
                .filter(Boolean)
                .join('\n\n')
            }
          }
        }

        if (role && messageContent) {
          messages.push({ role, content: messageContent })
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    // Return last N messages
    return messages.slice(-maxMessages)
  } catch (error) {
    console.error('Failed to parse session content:', error)
    return []
  }
}

/**
 * Format conversation messages to markdown
 */
export function formatConversationMarkdown(messages: ConversationMessage[]): string {
  if (messages.length === 0) {
    return '*No conversation found*'
  }

  return messages
    .map(msg => {
      const icon = msg.role === 'user' ? '👤 User' : '🤖 Assistant'
      const content =
        msg.content.length > 1000 ? msg.content.substring(0, 1000) + '\n\n...' : msg.content
      return `## ${icon}\n\n${content}`
    })
    .join('\n\n---\n\n')
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Delete project history
 */
export async function deleteProjectHistory(projectId: string): Promise<void> {
  const { rm } = await import('fs/promises')
  // Convert project path to folder path
  const projectPath = getProjectFolderPath(projectId)
  await rm(projectPath, { recursive: true, force: true })
}

/**
 * Delete single session
 */
export async function deleteSession(filePath: string): Promise<void> {
  const { unlink } = await import('fs/promises')
  await unlink(filePath)
}
