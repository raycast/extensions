import { DeleteExecutorItemAction } from "./components/delete-executor-item-action";
import { workspaceTitle } from "./lib/workspaces";
import { WorkspaceAction } from "./components/workspace-command";
import { withWorkspace } from "./components/workspace-command";
import { ConsoleAction } from "./components/console-action";
import {
  Keyboard,
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { accountCacheKey, checkConnectionHealth, defaultOwner, listConnections, refreshConnection } from "./lib/client";
import { ConnectionSetupForm } from "./components/connection-setup-form";
import { ConnectionMetadataForm } from "./components/connection-metadata-form";
import { ConnectionReconnectAction } from "./components/connection-reconnect-action";
import { needsReconnect, type IntegrationWithAuth } from "./lib/connection-actions";
import {
  connectionLabel,
  HEALTH_STATUSES,
  formatDate,
  formatRelative,
  healthColor,
  titleCase,
  toDate,
} from "./lib/format";
import { integrationIcon, integrationLabel, useIntegrationDirectory } from "./lib/integrations";
import { recordedHealthAge } from "./lib/status";
import { ToolBrowser } from "./search-tools";
import type { Connection, HealthStatus } from "./lib/types";

function statusOf(connection: Connection): HealthStatus {
  return connection.lastHealth?.status ?? "unknown";
}

/** Credential dates are separate from reported health and can precede automatic refresh. */
function expiryAccessory(connection: Connection) {
  const expires = toDate(connection.expiresAt);
  if (!expires || statusOf(connection) === "expired") return undefined;
  const relative = formatRelative(connection.expiresAt);
  const expired = expires.getTime() < Date.now();
  return expired
    ? {
        icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
        tooltip: `Credential expiry: ${formatDate(connection.expiresAt)}. This date alone does not mean the connection needs repair; credentials may refresh automatically.`,
      }
    : { text: `Expires ${relative}`, tooltip: `Credential expiry: ${formatDate(connection.expiresAt)}` };
}

function Connections() {
  const directory = useIntegrationDirectory();
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listConnections({ owner: defaultOwner() });
    },
    [accountCacheKey()],
    {
      initialData: [],
      failureToastOptions: { title: "Could Not Load Connections" },
    },
  );

  const connections = data ?? [];

  async function onCheckHealth(connection: Connection) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Checking ${integrationLabel(connection.integration, directory)}`,
    });
    try {
      const health = await checkConnectionHealth(connection);
      toast.style = health.status === "healthy" ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = `${integrationLabel(connection.integration, directory)}: ${titleCase(health.status)}`;
      toast.message = health.detail ?? health.identity ?? health.reason ?? undefined;
      // The health check persists its result, so re-read the list to pick it up.
      await mutate(listConnections({ owner: defaultOwner() }), { shouldRevalidateAfter: false }).catch(() => undefined);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Health Check Failed";
      toast.message = (error as Error).message;
    }
  }

  async function onRefresh(connection: Connection) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Resyncing ${integrationLabel(connection.integration, directory)} Tools`,
    });
    try {
      const tools = await refreshConnection(connection);
      toast.style = Toast.Style.Success;
      toast.title = `${integrationLabel(connection.integration, directory)} Resynced`;
      toast.message = `${tools.length} tool${tools.length === 1 ? "" : "s"} available`;
    } catch (error) {
      await showFailureToast(error, { title: "Resync Failed" });
    }
  }

  return (
    <List
      navigationTitle={workspaceTitle("Manage Connections")}
      isLoading={isLoading}
      searchBarPlaceholder="Filter connections"
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Plug}
        title={error ? "Could Not Load Connections" : "No Connections Found"}
        description={error ? error.message : "Try another search, or add a connection in Executor."}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Connection"
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.Plus}
              target={<ConnectionSetupForm />}
            />
            <ConsoleAction title="Open Executor" path="/integrations" />
            <Action
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Reload Connections"
              icon={Icon.ArrowClockwise}
              onAction={() => revalidate()}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <WorkspaceAction />
          </ActionPanel>
        }
      />

      {HEALTH_STATUSES.map((status) => {
        const group = connections.filter((connection) => statusOf(connection) === status);
        if (group.length === 0) return null;

        return (
          <List.Section key={status} title={titleCase(status)} subtitle={`${group.length}`}>
            {group.map((connection) => {
              const health = connection.lastHealth;
              const accessories = [
                // The section header already names the status, so only an
                // unhealthy connection needs it repeated on the row itself.
                status !== "healthy"
                  ? {
                      tag: { value: titleCase(status), color: healthColor(status) },
                      tooltip:
                        [
                          health?.detail ?? health?.reason,
                          toDate(connection.expiresAt)
                            ? `Credential expiry: ${formatDate(connection.expiresAt)}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join("\n") || undefined,
                    }
                  : undefined,
                expiryAccessory(connection),
                connection.missingOAuthScopes.length > 0
                  ? {
                      tag: { value: "Missing Scopes", color: Color.Red },
                      tooltip: `Missing OAuth scopes: ${connection.missingOAuthScopes.join(", ")}`,
                    }
                  : undefined,
                health
                  ? { text: recordedHealthAge(health.checkedAt), tooltip: `Checked ${formatDate(health.checkedAt)}` }
                  : undefined,
                {
                  icon: connection.owner === "org" ? Icon.TwoPeople : Icon.Person,
                  tooltip: connection.owner === "org" ? "Workspace" : "Personal",
                },
              ].filter((accessory): accessory is NonNullable<typeof accessory> => accessory !== undefined);

              return (
                <List.Item
                  key={connection.address}
                  id={connection.address}
                  icon={integrationIcon(connection.integration, directory)}
                  title={integrationLabel(connection.integration, directory)}
                  keywords={[connection.name, connection.address, connection.description ?? "", connection.owner]}
                  subtitle={connectionLabel(connection)}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        {needsReconnect(connection) ? (
                          <ConnectionReconnectAction
                            connection={connection}
                            integration={directory.get(connection.integration) as IntegrationWithAuth | undefined}
                            onChecked={() => revalidate()}
                          />
                        ) : null}
                        <Action.Push
                          title="Browse Tools"
                          icon={Icon.MagnifyingGlass}
                          target={<ToolBrowser initialIntegration={connection.integration} connection={connection} />}
                        />
                        <Action.Push
                          title="Edit Connection Details"
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          icon={Icon.Pencil}
                          target={<ConnectionMetadataForm connection={connection} onSaved={() => revalidate()} />}
                        />
                        <Action.Push
                          title="Add Connection"
                          shortcut={Keyboard.Shortcut.Common.New}
                          icon={Icon.Plus}
                          target={<ConnectionSetupForm initialIntegration={connection.integration} />}
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section title="Connection">
                        <Action title="Check Health" icon={Icon.Heartbeat} onAction={() => onCheckHealth(connection)} />
                        <Action
                          title="Resync Tools"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                          onAction={() => onRefresh(connection)}
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section title="Copy">
                        <Action.CopyToClipboard
                          title="Copy Connection Address"
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          content={connection.address}
                          icon={Icon.Clipboard}
                        />
                      </ActionPanel.Section>

                      <ActionPanel.Section title="Navigation">
                        <ConsoleAction
                          title="Open in Executor"
                          path={`/integrations/${encodeURIComponent(connection.integration)}`}
                        />
                        <Action
                          title="Reload Connections"
                          icon={Icon.RotateClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={() => revalidate()}
                        />
                        <WorkspaceAction />
                      </ActionPanel.Section>

                      <ActionPanel.Section>
                        <DeleteExecutorItemAction
                          target={{
                            kind: "connection",
                            integration: connection.integration,
                            owner: connection.owner,
                            connection: connection.name,
                          }}
                          onDeleted={() => {
                            void revalidate();
                          }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default withWorkspace(Connections);
