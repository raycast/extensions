import { Action, ActionPanel, Color, Icon, List, Toast, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getDisplayStatus, getToggleAction, loadConnectionOverview, toggleConnection } from "./ivanti/client";
import { IvantiConnection, IvantiConnectionOverview } from "./ivanti/types";

export default function ConnectionCommand() {
  const [overview, setOverview] = useState<IvantiConnectionOverview>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const connections = overview?.connections ?? [];

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    setIsLoading(true);

    try {
      const nextOverview = await loadConnectionOverview();
      setOverview(nextOverview);
      setLoadError(undefined);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Ivanti Connections" searchBarPlaceholder="Search Ivanti connections">
      <List.Section title="Connections" subtitle={connections.length > 0 ? String(connections.length) : undefined}>
        {connections.map((connection) => (
          <List.Item
            key={connection.id}
            accessories={buildAccessories(connection)}
            actions={<ConnectionActions connection={connection} onRefresh={reload} />}
            icon={getConnectionIcon(connection)}
            subtitle={connection.uri}
            title={connection.name}
          />
        ))}
      </List.Section>

      {!isLoading && connections.length === 0 ? (
        <EmptyState error={loadError} overview={overview} onRefresh={reload} />
      ) : null}
    </List>
  );
}

function ConnectionActions(props: { connection: IvantiConnection; onRefresh: () => Promise<void> }) {
  const { connection, onRefresh } = props;
  const toggleAction = getToggleAction(connection);
  const toggleTitle = `Toggle Connection (${toggleAction === "disconnect" ? "Disconnect" : "Connect"})`;
  const toggleIcon = toggleAction === "disconnect" ? Icon.XMarkCircle : Icon.Link;
  const toggleToastTitle = toggleAction === "disconnect" ? "Disconnecting" : "Connecting";

  return (
    <ActionPanel>
      <Action
        icon={toggleIcon}
        onAction={() => performConnectionAction(toggleToastTitle, connection, toggleConnection, onRefresh)}
        title={toggleTitle}
      />
      <Action
        icon={Icon.Desktop}
        onAction={() => open("/Applications/Ivanti Secure Access.app")}
        title="Open Ivanti Secure Access"
      />
      <Action.CopyToClipboard content={connection.uri} title="Copy Server URL" />
      <Action
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        title="Refresh"
      />
    </ActionPanel>
  );
}

function EmptyState(props: { error?: string; overview?: IvantiConnectionOverview; onRefresh: () => Promise<void> }) {
  const { error, overview, onRefresh } = props;
  const title = !overview?.connectionStoreFound ? "No Ivanti connections found" : "No matching connections";
  const description = error
    ? error
    : !overview?.appInstalled
      ? "Ivanti Secure Access is not installed in /Applications."
      : !overview?.connectionStoreFound
        ? "The local connection store was not found. Open Ivanti and create or import a connection first."
        : (overview?.statusError ?? "No configured connections were found in the local Ivanti connection store.");

  return (
    <List.EmptyView
      actions={
        <ActionPanel>
          {overview?.appInstalled ? (
            <Action
              icon={Icon.Desktop}
              onAction={() => open("/Applications/Ivanti Secure Access.app")}
              title="Open Ivanti Secure Access"
            />
          ) : null}
          <Action
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            title="Refresh"
          />
        </ActionPanel>
      }
      description={description}
      title={title}
    />
  );
}

async function performConnectionAction(
  title: string,
  connection: IvantiConnection,
  action: (connection: IvantiConnection) => Promise<void>,
  onRefresh: () => Promise<void>,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title,
    message: connection.name,
  });

  try {
    await action(connection);

    toast.style = Toast.Style.Success;
    toast.title = `${title} request sent`;
    toast.message = connection.name;

    try {
      await onRefresh();
    } catch (refreshError) {
      toast.message = refreshError instanceof Error ? `${connection.name} (refresh failed)` : connection.name;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${title} failed`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function buildAccessories(connection: IvantiConnection): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        color: getConnectionStatusColor(connection),
        value: getDisplayStatus(connection),
      },
    },
    {
      tag: {
        color: Color.SecondaryText,
        value: connection.source,
      },
    },
  ];

  return accessories;
}

function getConnectionIcon(connection: IvantiConnection): Icon {
  if (connection.status === "unknown") {
    return getToggleAction(connection) === "disconnect" ? Icon.CheckCircle : Icon.Network;
  }

  switch (connection.status) {
    case "connected":
      return Icon.CheckCircle;
    case "connecting":
      return Icon.Clock;
    case "disconnecting":
      return Icon.XMarkCircle;
    default:
      return Icon.Network;
  }
}

function getStatusColor(status: IvantiConnection["status"]): Color {
  switch (status) {
    case "connected":
      return Color.Green;
    case "connecting":
      return Color.Orange;
    case "disconnecting":
      return Color.Red;
    case "disconnected":
      return Color.SecondaryText;
    default:
      return Color.SecondaryText;
  }
}

function getConnectionStatusColor(connection: IvantiConnection): Color {
  if (connection.status !== "unknown") {
    return getStatusColor(connection.status);
  }

  return getToggleAction(connection) === "disconnect" ? Color.Green : Color.SecondaryText;
}
