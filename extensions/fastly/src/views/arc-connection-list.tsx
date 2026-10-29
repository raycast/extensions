import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { ArcProvider, ArcProviderConnection } from "../types";
import { getArcProviderConnections, getArcProviders, deleteArcProviderConnection, isArcNotEntitledError } from "../api";
import { ArcConnectionForm } from "./arc-connection-form";
import { resolveProvider, providerDisplayName } from "../utils/arc-providers";
import { ArcUsageList } from "./arc-usage-list";
import { ArcNotEntitledView } from "./arc-not-entitled";

export function ArcConnectionList() {
  const [connections, setConnections] = useState<ArcProviderConnection[]>([]);
  const [providers, setProviders] = useState<ArcProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notEntitled, setNotEntitled] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    try {
      setIsLoading(true);
      const [connectionsResponse, providersResponse] = await Promise.all([
        getArcProviderConnections(),
        getArcProviders(),
      ]);
      setConnections(connectionsResponse.data || []);
      setProviders(providersResponse.data || []);
    } catch (error) {
      if (isArcNotEntitledError(error)) {
        setNotEntitled(true);
      } else {
        console.error("Error loading provider connections:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load provider connections",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteConnection(connection: ArcProviderConnection) {
    if (
      await confirmAlert({
        title: "Delete Provider Connection",
        message: `Are you sure you want to delete the "${connection.name}" connection? AI traffic routed to this provider will start failing.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteArcProviderConnection(connection.id);
        await showToast({ style: Toast.Style.Success, title: "Provider connection deleted", message: connection.name });
        await loadConnections();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete provider connection",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  if (notEntitled) {
    return <ArcNotEntitledView />;
  }

  function displayName(connection: ArcProviderConnection): string {
    return providerDisplayName(providers, connection.name);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search provider connections...">
      {connections.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Provider Connections"
          description="Connect an AI provider so AI Runtime Control can route traffic to it."
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Provider Connection"
                icon={Icon.Plus}
                target={<ArcConnectionForm providers={providers} connections={connections} onSaved={loadConnections} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        connections.map((connection) => (
          <List.Item
            key={connection.id}
            title={displayName(connection)}
            subtitle={connection.auth_type === "aws-iam" ? `AWS IAM · ${connection.region || ""}` : connection.base_url}
            icon={Icon.Plug}
            accessories={[
              {
                tag: `${connection.models.length} ${connection.models.length === 1 ? "model" : "models"}`,
                tooltip: connection.models.join("\n"),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Usage"
                    icon={Icon.BarChart}
                    target={
                      <ArcUsageList
                        filterProvider={
                          resolveProvider(providers, connection.name) || {
                            id: connection.name,
                            display_name: connection.name,
                            default_base_url: "",
                            models: [],
                          }
                        }
                      />
                    }
                  />
                  <Action.Push
                    title="Edit Connection"
                    icon={Icon.Pencil}
                    target={
                      <ArcConnectionForm
                        providers={providers}
                        connections={connections}
                        existingConnection={connection}
                        onSaved={loadConnections}
                      />
                    }
                  />
                  <Action.Push
                    title="Add Provider Connection"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <ArcConnectionForm providers={providers} connections={connections} onSaved={loadConnections} />
                    }
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Actions">
                  <Action.CopyToClipboard
                    title="Copy Connection ID"
                    content={connection.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action
                    title="Delete Connection"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteConnection(connection)}
                    shortcut={{
                      macOS: { modifiers: ["ctrl"], key: "x" },
                      Windows: { modifiers: ["ctrl"], key: "x" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Quick Access">
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    onAction={loadConnections}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
