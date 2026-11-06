import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { testConnection } from "../lib/connection";
import { clearSchemaCache } from "../lib/schema";
import { Shortcuts } from "../lib/shortcuts";
import { deleteEnvironment, useStore } from "../lib/store";
import { GraphQLEnvironment } from "../lib/types";
import { EnvironmentForm } from "./EnvironmentForm";

export function EnvironmentList() {
  const { environments, queries, isLoading } = useStore();

  async function handleDelete(env: GraphQLEnvironment) {
    const used = queries.filter((query) => query.environmentId === env.id).length;
    const confirmed = await confirmAlert({
      title: `Delete "${env.name}"?`,
      message: used
        ? `${used} ${used === 1 ? "query uses" : "queries use"} this environment and will need a new one before running.`
        : "This cannot be undone.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteEnvironment(env.id);
    await showToast({ style: Toast.Style.Success, title: "Environment deleted" });
  }

  async function handleClearSchema(env: GraphQLEnvironment) {
    await clearSchemaCache(env);
    await showToast({
      style: Toast.Style.Success,
      title: "Schema cache cleared",
      message: "It is reloaded on next run",
    });
  }

  const createAction = (
    <Action.Push title="Create Environment" icon={Icon.Plus} shortcut={Shortcuts.New} target={<EnvironmentForm />} />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search environments…" navigationTitle="GraphQL Environments">
      <List.EmptyView
        icon={Icon.Globe}
        title="No environments yet"
        description="An environment is a GraphQL endpoint plus the headers to send to it. Press ↵ to create one."
        actions={<ActionPanel>{createAction}</ActionPanel>}
      />
      {environments.map((env) => {
        const usage = queries.filter((query) => query.environmentId === env.id).length;
        const hasAuth = env.headers.some((header) => header.name.toLowerCase() === "authorization");
        return (
          <List.Item
            key={env.id}
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            title={env.name}
            subtitle={env.url}
            keywords={[env.url]}
            accessories={[
              ...(hasAuth ? [{ icon: Icon.Lock, tooltip: "Sends an Authorization header" }] : []),
              {
                text: `${env.headers.length} ${env.headers.length === 1 ? "header" : "headers"}`,
                tooltip: env.headers.map((header) => header.name).join(", ") || "No custom headers",
              },
              { tag: { value: `${usage} ${usage === 1 ? "query" : "queries"}`, color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Environment"
                    icon={Icon.Pencil}
                    target={<EnvironmentForm environment={env} />}
                  />
                  <Action
                    title="Test Connection"
                    icon={Icon.Network}
                    shortcut={Shortcuts.TestConnection}
                    onAction={() => testConnection(env)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {createAction}
                  <Action.Push
                    title="Duplicate Environment"
                    icon={Icon.CopyClipboard}
                    shortcut={Shortcuts.Duplicate}
                    target={<EnvironmentForm draft={{ ...env, name: `${env.name} Copy` }} />}
                  />
                  <Action.CopyToClipboard title="Copy Endpoint URL" content={env.url} shortcut={Shortcuts.Copy} />
                  <Action
                    title="Clear Cached Schema"
                    icon={Icon.ArrowClockwise}
                    shortcut={Shortcuts.ReloadSchema}
                    onAction={() => handleClearSchema(env)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Environment"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Shortcuts.Remove}
                    onAction={() => handleDelete(env)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
