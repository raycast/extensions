# Claude Projects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a "Claude Projects" command to browse historical Claude Code projects, view sessions, and quickly navigate to project directories.

**Architecture:** Read `~/.claude/projects/` directory to list projects, parse folder names to restore real paths, count `.jsonl` sessions, support smart Kitty navigation (jump to existing tab or create new), and provide session preview with parsed conversation format.

**Tech Stack:** TypeScript, React, Raycast API (List, List.Item.Detail, ActionPanel), Node.js fs/promises

---

## Task 1: Add Type Definitions

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add ClaudeProject and ClaudeSession interfaces**

Add at the end of the file:

```typescript
export interface ClaudeProject {
  id: string                    // Folder name (e.g., -Users-andyliao-IdeaProjects-gworkflow)
  path: string                  // Real path (e.g., /Users/andyliao/IdeaProjects/gworkflow)
  displayPath: string           // Display path with ~ (e.g., ~/IdeaProjects/gworkflow)
  displayName: string           // Project name (e.g., gworkflow)
  sessionCount: number          // Number of .jsonl files
  lastModified: Date            // Last modification time
}

export interface ClaudeSession {
  id: string                    // Session ID (filename without .jsonl)
  filePath: string              // Full path to .jsonl file
  fileSize: number              // File size in bytes
  lastModified: Date            // Last modification time
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add ClaudeProject, ClaudeSession, ConversationMessage types"
```

---

## Task 2: Create Claude Projects Utility

**Files:**
- Create: `src/utils/claudeProjects.ts`

**Step 1: Create the utility file with all functions**

```typescript
/**
 * Claude Projects utility functions
 */

import { readdir, stat, readFile } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import type { ClaudeProject, ClaudeSession, ConversationMessage } from '../types'

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

/**
 * Convert folder name to real path
 * e.g., "-Users-andyliao-IdeaProjects-gworkflow" -> "/Users/andyliao/IdeaProjects/gworkflow"
 */
function folderNameToPath(folderName: string): string {
  // Replace leading dash and convert remaining dashes to slashes
  return folderName.replace(/^-/, '/').replace(/-/g, '/')
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
    const entries = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })

    const projects: ClaudeProject[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const folderPath = join(CLAUDE_PROJECTS_DIR, entry.name)
      const realPath = folderNameToPath(entry.name)

      // Count .jsonl files
      const files = await readdir(folderPath)
      const sessionCount = files.filter(f => f.endsWith('.jsonl')).length

      // Get last modified time
      const folderStat = await stat(folderPath)

      projects.push({
        id: entry.name,
        path: realPath,
        displayPath: toDisplayPath(realPath),
        displayName: getProjectName(realPath),
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
    const projectPath = join(CLAUDE_PROJECTS_DIR, projectId)
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
export async function parseSessionContent(filePath: string, maxMessages: number = 20): Promise<ConversationMessage[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n')

    const messages: ConversationMessage[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const json = JSON.parse(line)

        // Handle different jsonl formats
        let role: 'user' | 'assistant' | null = null
        let messageContent: string | null = null

        if (json.type === 'user' || json.role === 'user') {
          role = 'user'
          messageContent = json.message || json.content || JSON.stringify(json)
        } else if (json.type === 'assistant' || json.role === 'assistant') {
          role = 'assistant'
          messageContent = json.message || json.content || JSON.stringify(json)
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

  return messages.map(msg => {
    const icon = msg.role === 'user' ? '👤 User' : '🤖 Assistant'
    const content = msg.content.length > 500
      ? msg.content.substring(0, 500) + '...'
      : msg.content
    return `**${icon}**\n\n${content}`
  }).join('\n\n---\n\n')
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
  const projectPath = join(CLAUDE_PROJECTS_DIR, projectId)
  await rm(projectPath, { recursive: true, force: true })
}

/**
 * Delete single session
 */
export async function deleteSession(filePath: string): Promise<void> {
  const { unlink } = await import('fs/promises')
  await unlink(filePath)
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/utils/claudeProjects.ts
git commit -m "feat(utils): add claudeProjects utility for project/session management"
```

---

## Task 3: Add Smart Kitty Navigation

**Files:**
- Modify: `src/utils/kittyAPI.ts`

**Step 1: Add openProjectInKitty function**

Add at the end of the file:

```typescript
/**
 * Smart open project in Kitty
 * - If a tab with matching cwd exists, focus it
 * - Otherwise, create a new tab
 */
export const openProjectInKitty = async (projectPath: string): Promise<void> => {
  try {
    // Get all tabs
    const instances = await listKittyInstances()
    const allTabs = instances.flatMap(inst => inst.windows.flatMap(win => win.tabs))

    // Find tab with matching working directory
    const matchingTab = allTabs.find(tab =>
      tab.workingDirectory === projectPath ||
      tab.workingDirectory.startsWith(projectPath + '/')
    )

    if (matchingTab) {
      // Focus existing tab
      await focusWindow(matchingTab.windowPaneId || matchingTab.id)
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
```

**Step 2: Export getActualSocketPath (make it accessible)**

Change line ~70 from:
```typescript
const getActualSocketPath = async (): Promise<string | null> => {
```
to:
```typescript
export const getActualSocketPath = async (): Promise<string | null> => {
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/kittyAPI.ts
git commit -m "feat(kittyAPI): add openProjectInKitty for smart navigation"
```

---

## Task 4: Create Session List Component

**Files:**
- Create: `src/components/SessionList.tsx`

**Step 1: Create the SessionList component with detail view**

```typescript
/**
 * SessionList component - displays sessions with conversation preview
 */

import { useState, useEffect } from 'react'
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from '@raycast/api'
import type { ClaudeSession } from '../types'
import {
  listProjectSessions,
  parseSessionContent,
  formatConversationMarkdown,
  formatRelativeTime,
  formatFileSize,
  deleteSession,
} from '../utils/claudeProjects'

interface SessionListProps {
  projectId: string
  projectName: string
  onBack: () => void
  onSessionDeleted: () => void
}

export default function SessionList({ projectId, projectName, onBack, onSessionDeleted }: SessionListProps) {
  const [sessions, setSessions] = useState<ClaudeSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSessionContent, setSelectedSessionContent] = useState<string>('')

  const loadSessions = async () => {
    setIsLoading(true)
    const result = await listProjectSessions(projectId)
    setSessions(result)
    setIsLoading(false)
  }

  useEffect(() => {
    loadSessions()
  }, [projectId])

  const handleSelectionChange = async (sessionId: string | null) => {
    if (!sessionId) {
      setSelectedSessionContent('')
      return
    }

    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    const messages = await parseSessionContent(session.filePath)
    const markdown = formatConversationMarkdown(messages)
    setSelectedSessionContent(markdown)
  }

  const handleDelete = async (session: ClaudeSession) => {
    if (await confirmAlert({
      title: 'Delete Session',
      message: `Are you sure you want to delete "${session.id}"?`,
      primaryAction: { title: 'Delete', style: Alert.ActionStyle.Destructive },
    })) {
      try {
        await deleteSession(session.filePath)
        await showToast({ style: Toast.Style.Success, title: 'Session deleted' })
        onSessionDeleted()
        await loadSessions()
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to delete session',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  return (
    // @ts-expect-error - Raycast API type compatibility with React 18
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={projectName}
      searchBarPlaceholder="Search sessions..."
      onSelectionChange={handleSelectionChange}
    >
      {sessions.map(session => (
        // @ts-expect-error - Raycast API type compatibility with React 18
        <List.Item
          key={session.id}
          id={session.id}
          title={session.id}
          subtitle={`${formatFileSize(session.fileSize)} • ${formatRelativeTime(session.lastModified)}`}
          icon={Icon.Document}
          detail={
            // @ts-expect-error - Raycast API type compatibility with React 18
            <List.Item.Detail markdown={selectedSessionContent || '*Select a session to preview*'} />
          }
          actions={
            // @ts-expect-error - Raycast API type compatibility with React 18
            <ActionPanel>
              <Action.Open
                title="Open in Editor"
                target={session.filePath}
                shortcut={{ modifiers: ['cmd'], key: 'o' }}
              />
              <Action.CopyToClipboard
                title="Copy Session ID"
                content={session.id}
                shortcut={{ modifiers: ['cmd'], key: 'c' }}
              />
              {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
              <Action
                title="Delete Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                onAction={() => handleDelete(session)}
              />
              {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
              <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/SessionList.tsx
git commit -m "feat(components): add SessionList with conversation preview"
```

---

## Task 5: Create List Projects Command

**Files:**
- Create: `src/commands/listProjects.tsx`

**Step 1: Create the main command component**

```typescript
/**
 * Main command to list Claude Code projects
 */

import { useState, useEffect } from 'react'
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from '@raycast/api'
import type { ClaudeProject } from '../types'
import {
  listClaudeProjects,
  formatRelativeTime,
  deleteProjectHistory,
} from '../utils/claudeProjects'
import { openProjectInKitty } from '../utils/kittyAPI'
import SessionList from '../components/SessionList'

export default function ListProjects() {
  const [projects, setProjects] = useState<ClaudeProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ClaudeProject | null>(null)

  const loadProjects = async () => {
    setIsLoading(true)
    const result = await listClaudeProjects()
    setProjects(result)
    setIsLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleOpenInKitty = async (project: ClaudeProject) => {
    try {
      await openProjectInKitty(project.path)
      await showToast({ style: Toast.Style.Success, title: 'Opened in Kitty' })
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to open in Kitty',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleDelete = async (project: ClaudeProject) => {
    if (await confirmAlert({
      title: 'Delete Project History',
      message: `Are you sure you want to delete all session history for "${project.displayName}"?\n\nThis will not delete the actual project files.`,
      primaryAction: { title: 'Delete', style: Alert.ActionStyle.Destructive },
    })) {
      try {
        await deleteProjectHistory(project.id)
        await showToast({ style: Toast.Style.Success, title: 'Project history deleted' })
        await loadProjects()
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to delete history',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  // Show session list if a project is selected
  if (selectedProject) {
    return (
      <SessionList
        projectId={selectedProject.id}
        projectName={selectedProject.displayName}
        onBack={() => setSelectedProject(null)}
        onSessionDeleted={() => loadProjects()}
      />
    )
  }

  return (
    // @ts-expect-error - Raycast API type compatibility with React 18
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        // @ts-expect-error - Raycast API type compatibility with React 18
        <List.EmptyView
          title="No projects found"
          description="No Claude Code project history found"
          icon={Icon.Folder}
        />
      ) : (
        projects.map(project => (
          // @ts-expect-error - Raycast API type compatibility with React 18
          <List.Item
            key={project.id}
            title={project.displayPath}
            subtitle={`${project.sessionCount} session${project.sessionCount !== 1 ? 's' : ''} • ${formatRelativeTime(project.lastModified)}`}
            icon={Icon.Folder}
            accessories={[{ text: project.displayName }]}
            actions={
              // @ts-expect-error - Raycast API type compatibility with React 18
              <ActionPanel>
                <ActionPanel.Section>
                  {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
                  <Action
                    title="Open in Kitty"
                    icon={Icon.Terminal}
                    onAction={() => handleOpenInKitty(project)}
                  />
                  <Action.OpenWith
                    title="Open in Finder"
                    path={project.path}
                    shortcut={{ modifiers: ['cmd'], key: 'return' }}
                  />
                  <Action.OpenWith
                    title="Open With..."
                    path={project.path}
                    shortcut={{ modifiers: ['cmd'], key: 'o' }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Project Name"
                    content={project.displayName}
                    shortcut={{ modifiers: ['cmd'], key: 'c' }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={project.path}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
                  <Action
                    title="View Sessions"
                    icon={Icon.List}
                    shortcut={{ modifiers: ['cmd'], key: 's' }}
                    onAction={() => setSelectedProject(project)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {/* @ts-expect-error - Raycast API type compatibility with React 18 */}
                  <Action
                    title="Delete History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                    onAction={() => handleDelete(project)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/commands/listProjects.tsx
git commit -m "feat(commands): add listProjects command for Claude projects"
```

---

## Task 6: Register Command in Package.json

**Files:**
- Modify: `package.json`

**Step 1: Add the new command to the commands array**

Find the `"commands"` array in package.json and add:

```json
{
  "name": "list-projects",
  "title": "Claude Projects",
  "subtitle": "Kitty Tabs",
  "description": "Browse Claude Code project history",
  "mode": "view"
}
```

**Step 2: Create entry point file**

Create `src/list-projects.tsx`:

```typescript
import ListProjects from './commands/listProjects'

export default ListProjects
```

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS (or warnings only)

**Step 5: Commit**

```bash
git add package.json src/list-projects.tsx
git commit -m "feat: register Claude Projects command"
```

---

## Task 7: Manual Testing

**Step 1: Start development mode**

Run: `npm run dev`

**Step 2: Test in Raycast**

1. Open Raycast, search "Claude Projects"
2. Verify project list appears with paths and session counts
3. Test "Open in Kitty" - should jump to existing tab or create new
4. Test "Open in Finder" (Cmd+Enter)
5. Test "Copy Project Name" (Cmd+C)
6. Test "Copy Path" (Cmd+Shift+C)
7. Test "View Sessions" (Cmd+S) - verify split view with conversation preview
8. Test session navigation and preview loading
9. Test "Delete History" with confirmation

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final adjustments after testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add type definitions | `src/types/index.ts` |
| 2 | Create claudeProjects utility | `src/utils/claudeProjects.ts` (new) |
| 3 | Add smart Kitty navigation | `src/utils/kittyAPI.ts` |
| 4 | Create SessionList component | `src/components/SessionList.tsx` (new) |
| 5 | Create listProjects command | `src/commands/listProjects.tsx` (new) |
| 6 | Register command | `package.json`, `src/list-projects.tsx` (new) |
| 7 | Manual testing | - |

**Total: 7 tasks, 3 modified + 4 new files**
