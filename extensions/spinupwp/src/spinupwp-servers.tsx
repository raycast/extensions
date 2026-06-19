import { ActionPanel, Action, List, Icon, showToast, Toast, Color, confirmAlert, Alert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getServers, rebootServer, restartNginx, restartRedis, restartPhp, restartMysql } from "./api";
import { Server } from "./types";
import AccountDropdown from "./components/AccountDropdown";

function getStatusIcon(server: Server): { source: Icon; tintColor: Color } {
  if (server.status === "provisioning") {
    return { source: Icon.Clock, tintColor: Color.Yellow };
  }
  if (server.status === "failed") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  if (server.connection_status === "disconnected") {
    return { source: Icon.WifiDisabled, tintColor: Color.Red };
  }
  return { source: Icon.CheckCircle, tintColor: Color.Green };
}

function formatDiskSpace(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

async function executeAction(
  actionName: string,
  actionFn: () => Promise<{ event_id: number }>,
  confirmMessage?: string,
) {
  if (confirmMessage) {
    const confirmed = await confirmAlert({
      title: `Confirm ${actionName}`,
      message: confirmMessage,
      primaryAction: {
        title: actionName,
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${actionName}...`,
  });

  try {
    await actionFn();
    toast.style = Toast.Style.Success;
    toast.title = `${actionName} started`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${actionName} failed`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

function ServerActions({ server }: { server: Server }) {
  const isAvailable = server.status === "provisioned" && server.connection_status === "connected";
  const hasDatabase = server.database?.server && server.database.server.length > 0;

  return (
    <ActionPanel>
      {isAvailable && (
        <ActionPanel.Section title="Server Actions">
          <Action
            title="Reboot Server"
            icon={Icon.RotateClockwise}
            onAction={() =>
              executeAction(
                "Reboot Server",
                () => rebootServer(server.id),
                `Are you sure you want to reboot "${server.name}"? This will temporarily make all sites on this server unavailable.`,
              )
            }
          />
          <Action
            title="Restart Nginx"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => executeAction("Restart Nginx", () => restartNginx(server.id))}
          />
          <Action
            title="Restart Redis"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => executeAction("Restart Redis", () => restartRedis(server.id))}
          />
          <Action
            title="Restart PHP-FPM"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => executeAction("Restart PHP-FPM", () => restartPhp(server.id))}
          />
          {hasDatabase && (
            <Action
              title="Restart MySQL"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => executeAction("Restart MySQL", () => restartMysql(server.id))}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Quick Links">
        <Action.OpenInBrowser
          title="Open in SpinupWP"
          url={`https://spinupwp.app/servers/${server.id}`}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy IP Address"
          content={server.ip_address}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const { data: servers, isLoading, error, revalidate } = useCachedPromise(getServers);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load servers",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search servers..."
      searchBarAccessory={<AccountDropdown onAccountChange={revalidate} />}
    >
      <List.EmptyView
        title={error ? "Failed to load servers" : "No servers found"}
        description={error ? error.message : "Add a server in your SpinupWP dashboard"}
        icon={error ? Icon.XMarkCircle : Icon.Desktop}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open SpinupWP Dashboard" url="https://spinupwp.app" />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {servers?.map((server) => (
        <List.Item
          key={server.id}
          title={server.name}
          subtitle={server.ip_address}
          icon={getStatusIcon(server)}
          accessories={[
            {
              text: server.provider_name,
              tooltip: `Provider: ${server.provider_name}`,
            },
            {
              text: server.size || undefined,
              tooltip: server.size ? `Size: ${server.size}` : undefined,
            },
            ...(server.reboot_required
              ? [
                  {
                    icon: { source: Icon.Warning, tintColor: Color.Orange },
                    tooltip: "Reboot required",
                  },
                ]
              : []),
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={server.name} />
                  <List.Item.Detail.Metadata.Label title="IP Address" text={server.ip_address} />
                  <List.Item.Detail.Metadata.Label title="Provider" text={server.provider_name} />
                  <List.Item.Detail.Metadata.Label title="Region" text={server.region || "N/A"} />
                  <List.Item.Detail.Metadata.Label title="Size" text={server.size || "N/A"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Ubuntu Version" text={server.ubuntu_version} />
                  <List.Item.Detail.Metadata.Label title="Database" text={server.database.server} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Disk Used"
                    text={`${formatDiskSpace(server.disk_space.used)} / ${formatDiskSpace(server.disk_space.total)}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Status" text={server.status} />
                  <List.Item.Detail.Metadata.Label title="Connection" text={server.connection_status} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={<ServerActions server={server} />}
        />
      ))}
    </List>
  );
}
