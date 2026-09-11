import { WorkspaceAction } from "./components/workspace-command";
import { workspaceTitle } from "./lib/workspaces";
import { withWorkspace } from "./components/workspace-command";
import { Keyboard, Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { CATALOG_KINDS, CatalogKind, isUrlInput, KIND_LABEL, searchCatalog } from "./lib/catalog";
import { integrationLogoUrl, useIntegrationDirectory } from "./lib/integrations";
import { INTEGRATION_KIND_ICON } from "./lib/integration-kind-icons";
import { ConsoleAction } from "./components/console-action";
import { IntegrationSetupForm } from "./components/integration-setup-form";
import type { IntegrationSetupDefaults } from "./lib/integration-setup";

function IntegrationBrowser() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const directory = useIntegrationDirectory();
  const urlMode = isUrlInput(query);
  const { data, isLoading, error, revalidate, pagination } = usePromise(
    (text: string, filter: string) =>
      async ({ page }: { page: number }) =>
        searchCatalog(text, filter === "all" ? undefined : (filter as CatalogKind), page),
    [query, kind],
  );
  const showCustomRow = urlMode || (!isLoading && (Boolean(error) || !data?.length));
  return (
    <List
      navigationTitle={workspaceTitle("Add Integration")}
      searchBarPlaceholder="Search services or paste an endpoint URL"
      filtering={false}
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      pagination={urlMode ? undefined : pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Integration Type" value={kind} onChange={setKind}>
          <List.Dropdown.Item title="All Types" value="all" icon={Icon.Layers} />
          {CATALOG_KINDS.map((type) => (
            <List.Dropdown.Item key={type} title={KIND_LABEL[type]} value={type} icon={INTEGRATION_KIND_ICON[type]} />
          ))}
        </List.Dropdown>
      }
    >
      {!urlMode && error ? (
        <List.Item
          id="catalog-error"
          title="Catalog Unavailable"
          subtitle={error.message}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action
                shortcut={Keyboard.Shortcut.Common.Refresh}
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
              <Action.Push
                title="Add Custom Integration"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<IntegrationSetupForm defaults={{ kind: kind === "all" ? "mcp" : (kind as CatalogKind) }} />}
              />
              <ConsoleAction title="Browse in Executor" path="/integrations/browse" />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : null}
      {!urlMode && !error && !isLoading && data?.length === 0 ? (
        <List.Item
          id="catalog-empty"
          title="No Integrations Found"
          subtitle="Try a service name or add a custom integration."
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Custom Integration"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<IntegrationSetupForm defaults={{ kind: kind === "all" ? "mcp" : (kind as CatalogKind) }} />}
              />
              <Action
                title="Reload Catalog"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => revalidate()}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : null}
      {!urlMode && !error ? (
        <List.Section title={query.trim() ? "Results" : "Integration Catalog"}>
          {data?.map((item) => {
            const installed = item.slug ? directory.get(item.slug) : undefined;
            const matches = installed?.kind === item.kind;
            return (
              <List.Item
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={item.description}
                icon={{ source: integrationLogoUrl(item.domain), fallback: Icon.Plug }}
                accessories={[...(matches ? [{ tag: "Added" }] : []), { text: item.domain }]}
                actions={
                  <ActionPanel>
                    {matches ? (
                      <ConsoleAction
                        title="Open Integration in Executor"
                        path={`/integrations/${encodeURIComponent(item.slug!)}`}
                      />
                    ) : (
                      <Action.Push
                        title="Configure Integration"
                        icon={Icon.Plus}
                        target={<IntegrationSetupForm item={item} />}
                      />
                    )}
                    <Action.Push
                      title="View Integration Details"
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      icon={Icon.Info}
                      target={<IntegrationSetupForm item={item} />}
                    />
                    <Action.Push
                      title="Add Custom Integration"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={
                        <IntegrationSetupForm defaults={{ kind: kind === "all" ? "mcp" : (kind as CatalogKind) }} />
                      }
                    />
                    <Action
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      title="Reload Catalog"
                      icon={Icon.ArrowClockwise}
                      onAction={() => revalidate()}
                    />
                    <WorkspaceAction />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
      {showCustomRow ? (
        <List.Section title={urlMode ? "Custom Integration" : "Start from Scratch"}>
          {urlMode ? (
            <List.Item
              id="custom-url"
              title="Add from URL"
              subtitle={query}
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Configure Integration"
                    icon={Icon.Gear}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <IntegrationSetupForm
                        defaults={{ endpoint: query, kind: kind === "all" ? "mcp" : (kind as CatalogKind) }}
                      />
                    }
                  />
                  <WorkspaceAction />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              id="custom-integration"
              title="Add Custom Integration"
              subtitle="MCP, OpenAPI, or GraphQL"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Configure Integration"
                    icon={Icon.Gear}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <IntegrationSetupForm defaults={{ kind: kind === "all" ? "mcp" : (kind as CatalogKind) }} />
                    }
                  />
                  <WorkspaceAction />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}
    </List>
  );
}

export function AddIntegration({ launchContext }: { launchContext?: { integrationSetup?: IntegrationSetupDefaults } }) {
  return launchContext?.integrationSetup ? (
    <IntegrationSetupForm defaults={launchContext.integrationSetup} />
  ) : (
    <IntegrationBrowser />
  );
}

export default withWorkspace(AddIntegration);
