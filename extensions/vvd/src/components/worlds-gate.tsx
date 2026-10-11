import { Action, ActionPanel, Icon, List } from "@raycast/api"
import type { ReactElement } from "react"

import { useConnection } from "../lib/use-connection"
import { useWorlds } from "../lib/use-worlds"
import { type Connection, type World, preferredOrigin } from "../lib/vvd"
import { ApiErrorEmptyView, NotConnectedEmptyView } from "./status-views"

/**
 * Every command starts the same way: is there a connection, and which worlds
 * does it see? This renders the loading / not-connected / error / no-worlds
 * states once, and hands a ready `(connection, worlds)` to the command's view.
 */
export function WorldsGate({
  children,
}: {
  children: (connection: Connection, worlds: World[]) => ReactElement
}) {
  const { connection, isLoading: checking } = useConnection()
  const { worlds, isLoading, error, revalidate } = useWorlds(connection)
  const origin = connection?.origin ?? preferredOrigin()

  if (checking && connection === undefined) return <List isLoading />
  if (!connection) {
    return (
      <List>
        <NotConnectedEmptyView origin={origin} />
      </List>
    )
  }
  if (error && worlds.length === 0) {
    return (
      <List>
        <ApiErrorEmptyView error={error} origin={origin} retry={revalidate} />
      </List>
    )
  }
  if (!isLoading && worlds.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Globe}
          title="No worlds yet"
          description="Create your first world in vvd, then come back."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Website" url={origin} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    )
  }
  if (worlds.length === 0) return <List isLoading />
  return children(connection, worlds)
}
