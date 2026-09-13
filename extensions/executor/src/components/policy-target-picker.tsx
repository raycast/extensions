import { listDisplayIntegrations } from "../lib/integration-display";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, type ReactElement } from "react";
import { accountCacheKey, listConnections, listTools } from "../lib/client";
import { integrationIcon, integrationLabel, useIntegrationDirectory } from "../lib/integrations";
import { connectionPresentation, summarize, toolLabel } from "../lib/format";
import { integrationPolicyPattern, exactPolicyPattern } from "../lib/policies";
import { workspaceTitle } from "../lib/workspaces";
import { WorkspaceAction } from "./workspace-command";
import { ConnectionSetupForm } from "./connection-setup-form";
import { connectedTools } from "../lib/tool-availability";

type Props = { policyForm: (pattern?: string) => ReactElement };

function IntegrationPicker({ policyForm }: Props) {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listDisplayIntegrations();
    },
    [accountCacheKey()],
  );
  const directory = new Map(data.map((item) => [item.slug, item]));
  return (
    <List
      isLoading={isLoading}
      navigationTitle={workspaceTitle("Choose an Integration")}
      searchBarPlaceholder="Search integrations"
    >
      <List.EmptyView
        title={error ? "Could Not Load Integrations" : "No Integrations Found"}
        icon={error ? Icon.Warning : Icon.Plug}
        description={error?.message ?? "Add an integration before creating a rule for it."}
        actions={
          <ActionPanel>
            <Action
              title="Reload Integrations"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
      {[...data]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => (
          <List.Item
            key={item.slug}
            title={item.name}
            subtitle="All tools and connections"
            keywords={[item.slug]}
            icon={integrationIcon(item.slug, directory)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Set Policy Action"
                  icon={Icon.Shield}
                  target={policyForm(integrationPolicyPattern(item.slug))}
                />
                <Action
                  title="Reload Integrations"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <WorkspaceAction />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function ToolPicker({ policyForm }: Props) {
  const [query, setQuery] = useState("");
  const [integration, setIntegration] = useState("all");
  const directory = useIntegrationDirectory();
  const shouldFetch = integration !== "all" || query.trim().length >= 2;
  const {
    data: connections = [],
    isLoading: loadingConnections,
    error: connectionError,
    revalidate: reloadConnections,
  } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listConnections();
    },
    [accountCacheKey()],
  );
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (_scope: string, selected: string, search: string) => {
      void _scope;
      if (selected === "all" && search.trim().length < 2) return [];
      return listTools({ integration: selected === "all" ? undefined : selected, query: search.trim() || undefined });
    },
    [accountCacheKey(), integration, query],
  );
  const tools =
    isLoading || error || loadingConnections || connectionError
      ? []
      : connectedTools(data, connections).sort((a, b) => toolLabel(a.name).localeCompare(toolLabel(b.name)));
  const needsConnection =
    integration !== "all" &&
    !loadingConnections &&
    !connectionError &&
    !isLoading &&
    !error &&
    tools.length === 0 &&
    integration !== "executor" &&
    directory.get(integration)?.kind !== "built-in" &&
    !connections.some((item) => item.integration === integration);
  async function reload() {
    await Promise.all([reloadConnections(), revalidate()]);
  }
  return (
    <List
      isLoading={isLoading || loadingConnections}
      navigationTitle={workspaceTitle("Choose a Tool")}
      searchBarPlaceholder="Search tools by name or task"
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Integration" value={integration} onChange={setIntegration}>
          <List.Dropdown.Item value="all" title="All Integrations" icon={Icon.Plug} />
          {[...directory.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <List.Dropdown.Item
                key={item.slug}
                value={item.slug}
                title={item.name}
                icon={integrationIcon(item.slug, directory)}
              />
            ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={
          error || connectionError
            ? Icon.Warning
            : needsConnection
              ? integrationIcon(integration, directory)
              : Icon.MagnifyingGlass
        }
        title={
          error || connectionError
            ? "Could Not Load Tools"
            : needsConnection
              ? "No Tools Yet"
              : shouldFetch
                ? "No Matching Tools"
                : "Find a Tool"
        }
        description={
          connectionError?.message ??
          error?.message ??
          (needsConnection
            ? `Add a connection to use ${integrationLabel(integration, directory)} tools.`
            : shouldFetch
              ? "Try another search or integration. Existing policies can still be edited from Manage Policies."
              : "Type at least two characters, or choose an integration. No tool address needed.")
        }
        actions={
          <ActionPanel>
            {needsConnection ? (
              <Action.Push
                title="Add Connection"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<ConnectionSetupForm initialIntegration={integration} />}
                onPop={() => void reload()}
              />
            ) : null}
            {shouldFetch || connectionError ? (
              <Action
                title="Reload Tools"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={reload}
              />
            ) : null}
            <WorkspaceAction />
          </ActionPanel>
        }
      />
      <List.Section
        title="Available Tools"
        subtitle={tools.length > 100 ? `Showing 100 of ${tools.length}; narrow your search` : String(tools.length)}
      >
        {tools.slice(0, 100).map((tool) => {
          const connection = connectionPresentation(
            { integration: tool.integration, owner: tool.owner, name: tool.connection },
            connections,
          );
          return (
            <List.Item
              key={tool.address}
              id={tool.address}
              title={toolLabel(tool.name)}
              subtitle={summarize(tool.description)}
              icon={integrationIcon(tool.integration, directory)}
              accessories={[
                ...(integration === "all" ? [{ text: integrationLabel(tool.integration, directory) }] : []),
                { text: connection.text, tooltip: connection.tooltip },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Set Policy Action"
                    icon={Icon.Shield}
                    target={policyForm(exactPolicyPattern(tool.address))}
                  />
                  <Action.CopyToClipboard
                    title="Copy Tool Address"
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={tool.address}
                  />
                  <Action
                    title="Reload Tools"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={reload}
                  />
                  <WorkspaceAction />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export function PolicyTargetPicker({ policyForm }: Props) {
  return (
    <List navigationTitle={workspaceTitle("New Policy")} searchBarPlaceholder="Choose what this policy applies to">
      <List.Section title="Applies To">
        <List.Item
          title="A Specific Tool"
          subtitle="Find a tool by name, task, or integration"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose a Tool"
                icon={Icon.MagnifyingGlass}
                target={<ToolPicker policyForm={policyForm} />}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
        <List.Item
          title="An Integration"
          subtitle="Every tool across its connections"
          icon={Icon.Plug}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose an Integration"
                icon={Icon.Plug}
                target={<IntegrationPicker policyForm={policyForm} />}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
        <List.Item
          title="All Tools"
          subtitle="Every integration and connection"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.Push title="Set Policy Action" icon={Icon.Shield} target={policyForm("*")} />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Advanced">
        <List.Item
          title="Custom Pattern"
          subtitle="Write an exact address or wildcard rule"
          icon={Icon.Code}
          actions={
            <ActionPanel>
              <Action.Push title="Enter a Pattern" icon={Icon.Code} target={policyForm()} />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
