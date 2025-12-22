/**
 * Claude JSON configuration utilities
 * Parses ~/.claude.json to extract project information
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

const CLAUDE_JSON_PATH = join(homedir(), '.claude.json')

/**
 * Project metadata from .claude.json
 */
export interface ClaudeJsonProject {
  lastSessionId?: string
  lastCost?: number
  lastAPIDuration?: number
  lastDuration?: number
  lastTotalInputTokens?: number
  lastTotalOutputTokens?: number
  lastModelUsage?: {
    [modelName: string]: {
      inputTokens: number
      outputTokens: number
      costUSD: number
    }
  }
  exampleFiles?: string[]
  lastLinesAdded?: number
  lastLinesRemoved?: number
}

/**
 * Parse .claude.json and extract projects section
 */
export async function parseClaudeJsonProjects(): Promise<Record<string, ClaudeJsonProject>> {
  try {
    const content = await readFile(CLAUDE_JSON_PATH, 'utf-8')
    const json = JSON.parse(content)

    // Extract projects section
    if (json.projects && typeof json.projects === 'object') {
      return json.projects
    }

    return {}
  } catch (error) {
    console.error('Failed to parse .claude.json:', error)
    return {}
  }
}

/**
 * Convert project path to folder name format
 *
 * Mapping rules:
 * 1. Expand ~ (only if at the start of path followed by / or end) to actual home directory path
 * 2. Remove leading /
 * 3. Replace all / with -
 * 4. Replace all _ with -
 * 5. Replace spaces with -
 * 6. Add leading -
 *
 * Examples:
 * - "/Users/andyliao/raycast_repo/claude-code-projects" -> "-Users-andyliao-raycast-repo-claude-code-projects"
 * - "~/raycast_repo/claude-code-projects" -> "-Users-andyliao-raycast-repo-claude-code-projects"
 * - "/Users/andyliao/Library/Mobile Documents/com~apple~CloudDocs/..." -> "-Users-andyliao-Library-Mobile-Documents-com-apple-CloudDocs-..."
 * - "/path/with spaces/and_underscores" -> "-path-with-spaces-and-underscores"
 */
export function getProjectFolderName(projectPath: string): string {
  // Expand ~ to actual home directory path (only if at the start)
  // e.g., "~/projects" -> "/Users/user/projects"
  // but "com~apple~CloudDocs" should NOT be expanded
  let expandedPath = projectPath
  if (projectPath.startsWith('~/')) {
    expandedPath = join(homedir(), projectPath.slice(2))
  } else if (projectPath === '~') {
    expandedPath = homedir()
  }

  // Remove leading slash, replace / with -, replace _ with -, replace spaces with -, replace ~ with -, replace . with -, add leading -
  const pathPart = expandedPath.replace(/^\//, '')
  const withSlashesReplaced = pathPart.replace(/\//g, '-')
  const withUnderscoresReplaced = withSlashesReplaced.replace(/_/g, '-')
  const withSpacesReplaced = withUnderscoresReplaced.replace(/ /g, '-')
  const withTildesReplaced = withSpacesReplaced.replace(/~/g, '-')
  const withDotsReplaced = withTildesReplaced.replace(/\./g, '-')
  return '-' + withDotsReplaced
}

/**
 * Get project folder path in ~/.claude/projects/
 */
export function getProjectFolderPath(projectPath: string): string {
  const folderName = getProjectFolderName(projectPath)
  return join(homedir(), '.claude', 'projects', folderName)
}

/**
 * Delete a project from .claude.json
 */
export async function deleteProjectFromClaudeJson(projectPath: string): Promise<void> {
  try {
    const content = await readFile(CLAUDE_JSON_PATH, 'utf-8')
    const json = JSON.parse(content)

    // Remove the project from the projects section
    if (json.projects && typeof json.projects === 'object') {
      delete json.projects[projectPath]
    }

    // Write back the updated JSON with proper formatting
    await writeFile(CLAUDE_JSON_PATH, JSON.stringify(json, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to delete project from .claude.json:', error)
    throw error
  }
}
