import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api"
import type { ReactElement } from "react"
import { APP_URL } from "../lib/highseat"

interface RefreshActionProps {
  onRefresh: () => void
}

export function RefreshAction({ onRefresh }: RefreshActionProps) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  )
}

interface LoadErrorProps {
  error: Error
  actions: ReactElement
}

/** Raycast shows this only while the list has no rows, so cached rows stay on screen. */
export function LoadError({ error, actions }: LoadErrorProps) {
  return <List.EmptyView icon={Icon.Warning} title="Could not load" description={error.message} actions={actions} />
}

interface SitesEmptyViewProps {
  error?: Error
  isLoading: boolean
  onRefresh: () => void
}

export function SitesEmptyView({ error, isLoading, onRefresh }: SitesEmptyViewProps) {
  if (error && !isLoading) {
    return (
      <LoadError
        error={error}
        actions={
          <ActionPanel>
            <RefreshAction onRefresh={onRefresh} />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List.EmptyView
      icon={Icon.Globe}
      title="No sites yet"
      description="Add a site in the dashboard."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Dashboard" url={APP_URL} />
        </ActionPanel>
      }
    />
  )
}
