/**
 * Main command to list Claude Code projects
 */

import { useState, useEffect } from 'react'
import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  closeMainWindow,
} from '@raycast/api'
import type { ClaudeProject } from '../types'
import {
  listClaudeProjects,
  formatRelativeTime,
  deleteProjectHistory,
} from '../utils/claudeProjects'
import { openProjectInKitty } from '../utils/kittyAPI'
import {
  enrichProjectsWithPinInfo,
  pinProject,
  unpinProject,
  moveProjectUp,
  moveProjectDown,
} from '../utils/pinnedProjects'
import { deleteProjectFromClaudeJson } from '../utils/claudeJson'
import SessionList from '../components/SessionList'

export default function ListProjects() {
  const [projects, setProjects] = useState<ClaudeProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ClaudeProject | null>(null)

  const loadProjects = async () => {
    setIsLoading(true)
    const result = await listClaudeProjects()
    const enrichedProjects = await enrichProjectsWithPinInfo(result)

    // Sort projects: pinned first (by pinOrder), then by lastModified
    const sortedProjects = enrichedProjects.sort((a, b) => {
      // If one is pinned and the other isn't, pinned comes first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      // If both are pinned, sort by pinOrder
      if (a.isPinned && b.isPinned && a.pinOrder !== undefined && b.pinOrder !== undefined) {
        return a.pinOrder - b.pinOrder
      }

      // If neither is pinned, sort by lastModified (newest first)
      return b.lastModified.getTime() - a.lastModified.getTime()
    })

    setProjects(sortedProjects)
    setIsLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleTogglePin = async (project: ClaudeProject) => {
    try {
      if (project.isPinned) {
        await unpinProject(project.id)
        await showToast({ style: Toast.Style.Success, title: 'Project unpinned' })
      } else {
        await pinProject(project.id)
        await showToast({ style: Toast.Style.Success, title: 'Project pinned' })
      }
      await loadProjects()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to update pin status',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleMoveUp = async (project: ClaudeProject) => {
    try {
      await moveProjectUp(project.id)
      await loadProjects()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to move project up',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleMoveDown = async (project: ClaudeProject) => {
    try {
      await moveProjectDown(project.id)
      await loadProjects()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to move project down',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleOpenInKitty = async (project: ClaudeProject) => {
    try {
      await openProjectInKitty(project.path)
      await showToast({ style: Toast.Style.Success, title: 'Opened in Kitty' })
      await closeMainWindow()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to open in Kitty',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleDeleteFromClaudeJson = async (project: ClaudeProject) => {
    if (
      await confirmAlert({
        title: 'Delete from .claude.json',
        message: `Are you sure you want to remove "${project.displayName}" from .claude.json?\n\nThis will only remove it from the configuration file, not the actual project files or sessions.`,
        primaryAction: { title: 'Delete', style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteProjectFromClaudeJson(project.path)
        await showToast({ style: Toast.Style.Success, title: 'Removed from .claude.json' })
        await loadProjects()
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to delete from .claude.json',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  const handleDeleteSessionsOnly = async (project: ClaudeProject) => {
    if (
      await confirmAlert({
        title: 'Delete Session Files',
        message: `Are you sure you want to delete all session history for "${project.displayName}"?\n\nThis will delete all .jsonl files from ~/.claude/projects/[project]/ but will keep the project in .claude.json.`,
        primaryAction: { title: 'Delete', style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteProjectHistory(project.id)
        await showToast({ style: Toast.Style.Success, title: 'Session history deleted' })
        await loadProjects()
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to delete sessions',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  const handleDeleteFromJsonAndSessions = async (project: ClaudeProject) => {
    if (
      await confirmAlert({
        title: 'Delete Completely',
        message: `Are you sure you want to completely delete "${project.displayName}"?\n\nThis will:\n• Remove it from .claude.json\n• Delete all session history (.jsonl files)\n\nThis will not delete the actual project files.`,
        primaryAction: { title: 'Delete Everything', style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteProjectFromClaudeJson(project.path)
        await deleteProjectHistory(project.id)
        await showToast({ style: Toast.Style.Success, title: 'Project completely deleted' })
        await loadProjects()
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to delete project',
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
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No projects found"
          description="No Claude Code project history found"
          icon={Icon.Folder}
        />
      ) : (
        projects.map(project => (
          <List.Item
            key={project.id}
            title={project.displayPath}
            subtitle={`${project.sessionCount} session${project.sessionCount !== 1 ? 's' : ''} • ${formatRelativeTime(project.lastModified)}`}
            icon={project.isPinned ? Icon.Pin : Icon.Folder}
            accessories={[
              { text: project.displayName },
              ...(project.isPinned ? [{ icon: Icon.Pin, tooltip: 'Pinned' }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
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
                    title="Open with…"
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
                  <Action
                    title="View Sessions"
                    icon={Icon.List}
                    shortcut={{ modifiers: ['cmd'], key: 's' }}
                    onAction={() => setSelectedProject(project)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Pin">
                  <Action
                    title={project.isPinned ? 'Unpin Project' : 'Pin Project'}
                    icon={Icon.Pin}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
                    onAction={() => handleTogglePin(project)}
                  />
                  {project.isPinned && (
                    <>
                      <Action
                        title="Move up"
                        icon={Icon.ChevronUp}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'k' }}
                        onAction={() => handleMoveUp(project)}
                      />
                      <Action
                        title="Move Down"
                        icon={Icon.ChevronDown}
                        shortcut={{ modifiers: ['cmd', 'shift'], key: 'j' }}
                        onAction={() => handleMoveDown(project)}
                      />
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Delete">
                  <Action
                    title="Delete from .Claude.json"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                    onAction={() => handleDeleteFromClaudeJson(project)}
                  />
                  <Action
                    title="Delete Session Files"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ['shift'], key: 'backspace' }}
                    onAction={() => handleDeleteSessionsOnly(project)}
                  />
                  <Action
                    title="Delete Completely"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'backspace' }}
                    onAction={() => handleDeleteFromJsonAndSessions(project)}
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
