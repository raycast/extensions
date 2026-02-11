import { Action, Icon } from "@raycast/api"
import { Connection, ConnectionState } from "@/types"
import { ActionTitle } from "@/constants"

export function RefreshAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title={ActionTitle.Refresh}
      icon={Icon.Repeat}
      onAction={onAction}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  )
}

export function ConnectionAction({
  connection,
  onAction,
  isClose = false,
}: {
  connection: Connection
  onAction: (connection: Connection) => void
  isClose?: boolean
}) {
  const isConnectionActive = connection.state === ConnectionState.Connected
  const actionTitle = isConnectionActive ? ActionTitle.Disconnect : ActionTitle.Connect

  return (
    <Action
      title={isClose ? `${actionTitle} and Close` : actionTitle}
      icon={isConnectionActive ? Icon.XMarkCircle : Icon.Circle}
      onAction={() => onAction(connection)}
      shortcut={isClose ? { modifiers: ["cmd"], key: "enter" } : undefined}
    />
  )
}

export function QuickConnectAction({
  connection,
  onAction,
}: {
  connection: Connection
  onAction: (connection: Connection) => void
}) {
  return (
    <Action
      title={connection.isQuickConnect ? ActionTitle.RemoveQuickConnect : ActionTitle.MakeQuickConnect}
      icon={connection.isQuickConnect ? Icon.BoltDisabled : Icon.Bolt}
      onAction={() => onAction(connection)}
      shortcut={{ modifiers: ["shift", "cmd"], key: "q" }}
    />
  )
}
