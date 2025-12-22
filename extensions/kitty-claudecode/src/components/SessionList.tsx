/**
 * SessionList component - displays sessions with conversation preview
 */

import { useState, useEffect } from 'react'
import { List, ActionPanel, Action, Icon } from '@raycast/api'
import type { ProcessedHistoryEntry, TimeGroup } from '../types'
import { readHistoryFile } from '../utils/historyReader'
import { openClaudeSession } from '../utils/kittyAPI'

interface SessionListProps {
  projectId: string
  projectName: string
  onBack: () => void
  onSessionDeleted?: () => void
}

export default function SessionList({ projectId, projectName, onBack }: SessionListProps) {
  const [sessions, setSessions] = useState<ProcessedHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  const loadSessions = async () => {
    setIsLoading(true)
    const result = readHistoryFile(projectId)
    setSessions(result)
    setIsLoading(false)
  }

  useEffect(() => {
    loadSessions()
  }, [projectId])

  // Filter sessions based on search text
  const filteredSessions = sessions.filter(session =>
    session.display.toLowerCase().includes(searchText.toLowerCase())
  )

  // Group sessions by time
  const groupedSessions = groupSessionsByTime(filteredSessions)

  return (
    <List
      isLoading={isLoading}
      navigationTitle={projectName}
      searchBarPlaceholder="Search sessions..."
      onSearchTextChange={setSearchText}
    >
      {groupedSessions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No sessions found"
          description="No history entries for this project"
        />
      ) : (
        groupedSessions.map(group => (
          <List.Section key={group.label} title={group.label}>
            {group.entries.map(session => {
              return (
                <List.Item
                  key={session.id}
                  title={session.display}
                  subtitle={session.relativeTime}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open in Kitty"
                        icon={Icon.Terminal}
                        onAction={async () => {
                          await openClaudeSession(projectId, session.sessionId)
                        }}
                        shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                      />
                      <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
                    </ActionPanel>
                  }
                />
              )
            })}
          </List.Section>
        ))
      )}
    </List>
  )
}

/**
 * Group sessions by time period
 * @param sessions - Array of processed history entries
 * @returns Array of time groups
 */
function groupSessionsByTime(sessions: ProcessedHistoryEntry[]): TimeGroup[] {
  const groups: Record<string, ProcessedHistoryEntry[]> = {
    today: [],
    yesterday: [],
    pastWeek: [],
    older: [],
  }

  const labels = {
    today: 'Today',
    yesterday: 'Yesterday',
    pastWeek: 'Past week',
    older: 'Older',
  }

  sessions.forEach(session => {
    groups[session.group].push(session)
  })

  return Object.entries(labels)
    .filter(([key]) => groups[key].length > 0)
    .map(([key, label]) => ({
      label: label as string,
      entries: groups[key],
    }))
}
