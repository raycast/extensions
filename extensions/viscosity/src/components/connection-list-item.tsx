import { ActionPanel, Icon, List } from "@raycast/api"
import { Connection, ConnectionState } from "@/types"
import { Icons, Tooltip } from "@/constants"
import { RefreshAction, ConnectionAction, QuickConnectAction } from "./actions"

interface ConnectionListItemProps {
  connection: Connection
  onSelect: (connection: Connection) => void
  onSelectAndClose: (connection: Connection) => void
  onQuickConnect: (connection: Connection) => void
  onRefresh: () => void
}

export function ConnectionListItem({
  connection,
  onSelect,
  onSelectAndClose,
  onQuickConnect,
  onRefresh,
}: ConnectionListItemProps) {
  const getIcon = () => {
    switch (connection.state) {
      case ConnectionState.Connected:
        return Icons.Connected
      case ConnectionState.Disconnected:
        return Icons.Disconnected
      default:
        return Icons.Changing
    }
  }

  return (
    <List.Item
      id={connection.name}
      title={connection.name}
      icon={{ source: getIcon() }}
      accessories={
        connection.isQuickConnect
          ? [
              {
                icon: Icon.Bolt,
                tooltip: Tooltip.QuickConnectAccessory,
              },
            ]
          : []
      }
      actions={
        <ActionPanel>
          <ConnectionAction connection={connection} onAction={onSelect} />
          <ConnectionAction connection={connection} onAction={onSelectAndClose} isClose />
          <QuickConnectAction connection={connection} onAction={onQuickConnect} />
          <RefreshAction onAction={onRefresh} />
        </ActionPanel>
      }
    />
  )
}
