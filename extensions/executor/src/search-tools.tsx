import { WorkspaceAction } from "./components/workspace-command";
import { workspaceTitle } from "./lib/workspaces";
import { withWorkspace } from "./components/workspace-command";
import {
  Keyboard,
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  showToast,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { accountCacheKey, defaultOwner, getToolSchema, listConnections, listTools } from "./lib/client";
import { asJson, codeBlock, connectionLabel, summarize, titleCase, toolLabel, schemaFields } from "./lib/format";
import { integrationIcon, integrationLabel, useIntegrationDirectory } from "./lib/integrations";
import { saveTool } from "./lib/saved-tools";
import { PolicyBrowser } from "./policies";
import { ConsoleAction } from "./components/console-action";
import { RunTool } from "./components/run-tool";
import { ConnectionSetupForm } from "./components/connection-setup-form";
import { connectedTools } from "./lib/tool-availability";
import type { Connection, Owner, ToolSummary } from "./lib/types";

/**
 * `executor call` invocation for a tool, ready to paste into a terminal. The
 * CLI takes the tool path followed by a JSON argument object.
 */
function callCommand(tool: ToolSummary): string {
  return `executor call ${tool.address} '{}'`;
}

function ToolActions({ tool }: { tool: ToolSummary }) {
  return (
    <>
      <Action.Push title="Run Tool" icon={Icon.Play} target={<RunTool tool={tool} />} />
      <Action
        title="Save Tool"
        shortcut={Keyboard.Shortcut.Common.Save}
        icon={Icon.Star}
        onAction={async () => {
          try {
            await saveTool({ id: tool.address, title: toolLabel(tool.name), tool });
            await showToast({ style: Toast.Style.Success, title: "Tool Saved" });
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Save Tool" });
          }
        }}
      />
      <Action.CopyToClipboard
        title="Copy Tool Address"
        shortcut={Keyboard.Shortcut.Common.Copy}
        content={tool.address}
        icon={Icon.Clipboard}
      />
      <Action.CopyToClipboard
        title="Copy Executor Call Command"
        content={callCommand(tool)}
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      />
      <Action.Push
        title="Manage Policies for This Tool"
        icon={Icon.Shield}
        target={<PolicyBrowser initialPattern={tool.address.replace(/^tools\./, "")} />}
      />
      <ConsoleAction
        title="Open Integration in Executor"
        path={`/integrations/${encodeURIComponent(tool.integration)}`}
      />
    </>
  );
}

function ToolSchemaView({ tool, connectionName }: { tool: ToolSummary; connectionName: string }) {
  const directory = useIntegrationDirectory();
  const { data, isLoading, error, revalidate } = usePromise(
    async (address: string) => getToolSchema(address),
    [tool.address],
  );

  const sections: string[] = [`# ${toolLabel(tool.name)}`, ""];

  if (tool.description) sections.push(tool.description, "");

  if (error) {
    sections.push("## Schema Unavailable", "", error.message);
  } else if (data) {
    const fields = schemaFields(data.inputSchema);
    sections.push("## Inputs", "");
    sections.push(...(fields.length ? fields : ["Open Technical Schema to inspect the accepted input format."]));
    if (tool.approvalDescription) sections.push("", "## Approval", "", tool.approvalDescription);
  }

  const typeScript = [data?.inputTypeScript, data?.outputTypeScript].filter(Boolean).join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={sections.join("\n")}
      navigationTitle={workspaceTitle(toolLabel(tool.name))}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Integration"
            text={integrationLabel(tool.integration, directory)}
            icon={integrationIcon(tool.integration, directory)}
          />
          <Detail.Metadata.Label title="Connection" text={connectionName} />
          <Detail.Metadata.TagList title="Connection Scope">
            <Detail.Metadata.TagList.Item
              text={tool.owner === "org" ? "Workspace" : "Personal"}
              color={tool.owner === "org" ? Color.Purple : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Approval">
            <Detail.Metadata.TagList.Item
              text={tool.requiresApproval ? "Require Approval" : "Always Run"}
              color={tool.requiresApproval ? Color.Orange : Color.Green}
            />
          </Detail.Metadata.TagList>
          {tool.mayElicit ? <Detail.Metadata.Label title="Prompts" text="May prompt during a run" /> : null}
          {data?.outputSchemaSource === "observed" ? (
            <Detail.Metadata.Label title="Output Schema" text="Inferred from observed calls" />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ToolActions tool={tool} />
          {data ? (
            <Action.Push
              title="View Technical Schema"
              icon={Icon.Code}
              target={
                <Detail
                  navigationTitle={workspaceTitle(`${toolLabel(tool.name)} Schema`)}
                  markdown={[
                    "## Tool Address",
                    codeBlock(tool.address, "text"),
                    "## Input",
                    codeBlock(
                      data.inputTypeScript ?? asJson(data.inputSchema),
                      data.inputTypeScript ? "typescript" : "json",
                    ),
                    "## Output",
                    codeBlock(
                      data.outputTypeScript ?? asJson(data.outputSchema),
                      data.outputTypeScript ? "typescript" : "json",
                    ),
                    ...(data.typeScriptDefinitions
                      ? [
                          "## Type Definitions",
                          codeBlock(Object.values(data.typeScriptDefinitions).join("\n\n"), "typescript"),
                        ]
                      : []),
                    ...(data.schemaDefinitions
                      ? ["## Schema Definitions", codeBlock(asJson(data.schemaDefinitions))]
                      : []),
                  ].join("\n\n")}
                />
              }
            />
          ) : null}
          {/* Preserve standard acronyms rather than the linter's "Typescript" suggestion. */}
          {/* eslint-disable @raycast/prefer-title-case */}
          {typeScript.length > 0 ? (
            <Action.CopyToClipboard
              title="Copy TypeScript Types"
              content={typeScript}
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          ) : null}
          {/* eslint-enable @raycast/prefer-title-case */}
          {data?.inputSchema ? (
            <Action.CopyToClipboard
              title="Copy Input JSON Schema"
              content={asJson(data.inputSchema)}
              icon={Icon.Snippets}
            />
          ) : null}
          <Action
            title="Reload Tool"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <WorkspaceAction />
        </ActionPanel>
      }
    />
  );
}

export function ToolBrowser({
  initialIntegration = "all",
  connection,
}: {
  initialIntegration?: string;
  connection?: Connection;
}) {
  const [searchText, setSearchText] = useState("");
  const [integration, setIntegration] = useState(initialIntegration);
  const directory = useIntegrationDirectory();

  // Connections are cheap to list and give us the integrations that actually
  // have a live connection, which is a better filter list than every
  // integration in the catalog.
  const {
    data: connections,
    isLoading: loadingConnections,
    error: connectionError,
    revalidate: reloadConnections,
  } = useCachedPromise(
    async (_scope: string, owner: Owner | undefined) => {
      void _scope;
      return listConnections({ owner });
    },
    [accountCacheKey(), connection?.owner ?? defaultOwner()],
    {
      initialData: [],
      failureToastOptions: { title: "Could Not Load Connections" },
    },
  );

  const integrations = Array.from(
    new Set([
      ...(connections ?? []).map((connection) => connection.integration),
      ...[...directory.values()]
        .filter((item) => item.slug === "executor" || item.kind === "built-in")
        .map((item) => item.slug),
      ...(initialIntegration !== "all" ? [initialIntegration] : []),
    ]),
  ).sort();

  const trimmed = searchText.trim();
  const scoped = integration !== "all";
  // The catalog endpoint is unpaginated, so refuse to fetch until there is a
  // query or an integration filter to narrow it server-side.
  const shouldFetch = trimmed.length > 1 || scoped;

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (
      _scope: string,
      query: string,
      selected: string,
      fetchNow: boolean,
      owner: Owner | undefined,
      connectionName: string | undefined,
    ) => {
      if (!fetchNow) return [] as ToolSummary[];
      return listTools({
        query: query.length > 1 ? query : undefined,
        integration: selected === "all" ? undefined : selected,
        owner,
        connection: connectionName,
      });
    },
    [accountCacheKey(), trimmed, integration, shouldFetch, connection?.owner ?? defaultOwner(), connection?.name],
    {
      initialData: [] as ToolSummary[],
      keepPreviousData: false,
      onError: (error) => {
        void showFailureToast(error, { title: "Tool Search Failed" });
      },
    },
  );

  const tools = loadingConnections || connectionError ? [] : connectedTools(data ?? [], connections ?? []);
  const needsConnection =
    scoped &&
    !loadingConnections &&
    !connectionError &&
    !isLoading &&
    !error &&
    tools.length === 0 &&
    integration !== "executor" &&
    directory.get(integration)?.kind !== "built-in" &&
    !(connections ?? []).some(
      (item) =>
        item.integration === integration &&
        (!connection || (item.owner === connection.owner && item.name === connection.name)),
    );
  async function reload() {
    await Promise.all([reloadConnections(), revalidate()]);
  }
  function displayConnection(tool: ToolSummary): string {
    const matching = [connection, ...(connections ?? [])].find(
      (candidate) =>
        candidate?.integration === tool.integration &&
        candidate.owner === tool.owner &&
        candidate.name === tool.connection,
    );
    return matching ? connectionLabel(matching) : titleCase(tool.connection);
  }

  return (
    <List
      isLoading={isLoading || loadingConnections}
      filtering={false}
      navigationTitle={workspaceTitle(connection ? `${connectionLabel(connection)} Tools` : "Search Tools")}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search the Executor tool catalog"
      searchBarAccessory={
        connection ? undefined : (
          <List.Dropdown tooltip="Integration" value={integration} onChange={setIntegration}>
            <List.Dropdown.Item title="All Integrations" value="all" icon={Icon.Plug} />
            <List.Dropdown.Section title="Integrations">
              {integrations.map((name) => (
                <List.Dropdown.Item
                  key={name}
                  title={integrationLabel(name, directory)}
                  value={name}
                  icon={integrationIcon(name, directory)}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {connectionError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Connections"
          description={connectionError.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={reload}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : needsConnection ? (
        <List.EmptyView
          icon={integrationIcon(integration, directory)}
          title="No Tools Yet"
          description={`Add a connection to use ${integrationLabel(integration, directory)} tools.`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Connection"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={
                  <ConnectionSetupForm
                    initialIntegration={integration}
                    defaults={{ owner: connection?.owner ?? defaultOwner() }}
                  />
                }
                onPop={() => void reload()}
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
      ) : !shouldFetch ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for a Tool"
          description="Find tools by name or task, or choose an integration to browse its tools."
          actions={
            <ActionPanel>
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Search Tools"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                shortcut={Keyboard.Shortcut.Common.Refresh}
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={reload}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : !isLoading && tools.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Tools Found"
          description="Try another search or choose a different integration."
          actions={
            <ActionPanel>
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
      ) : (
        <List.Section
          title={scoped ? integrationLabel(integration, directory) : "Results"}
          subtitle={`${tools.length}`}
        >
          {tools.map((tool) => (
            <List.Item
              key={tool.address}
              icon={integrationIcon(tool.integration, directory)}
              title={toolLabel(tool.name)}
              subtitle={summarize(tool.description)}
              accessories={[
                // The provider logo now carries the integration, so the policy
                // gate needs its own marker rather than sharing the row icon.
                ...(tool.requiresApproval
                  ? [
                      {
                        icon: { source: Icon.Lock, tintColor: Color.Orange },
                        tooltip: "Requires Approval",
                      },
                    ]
                  : []),
                ...(!scoped
                  ? [{ tag: { value: integrationLabel(tool.integration, directory), color: Color.Blue } }]
                  : []),
                { text: displayConnection(tool) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Tool"
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    icon={Icon.Code}
                    target={<ToolSchemaView tool={tool} connectionName={displayConnection(tool)} />}
                  />
                  <ToolActions tool={tool} />
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
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchTools() {
  return <ToolBrowser />;
}

export default withWorkspace(SearchTools);
