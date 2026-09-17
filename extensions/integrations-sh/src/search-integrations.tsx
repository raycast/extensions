import { Action, ActionPanel, Icon, Image, List, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { domainPageUrl, logoUrl, searchIntegrations, surfaceApiUrl, type SearchResult, type SurfaceKind } from "./api";
import { SurfaceDetail } from "./surface-detail";

const KIND_LABEL: Record<SurfaceKind, string> = {
  mcp: "MCP",
  openapi: "OpenAPI",
  graphql: "GraphQL",
  cli: "CLI",
};

const KINDS: SurfaceKind[] = ["mcp", "openapi", "graphql", "cli"];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [kind, setKind] = useState<SurfaceKind | "all">("all");

  const { data, isLoading } = useCachedPromise(
    async (query: string, selectedKind: SurfaceKind | "all") => {
      const response = await searchIntegrations({
        query: query.trim(),
        kind: selectedKind === "all" ? undefined : selectedKind,
        limit: 30,
      });
      return response.results;
    },
    [searchText, kind],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Could not search integrations.sh" });
      },
    },
  );

  const results: SearchResult[] = data ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search domains, services, or integration types…"
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by surface kind"
          storeValue
          onChange={(value) => setKind(value as SurfaceKind | "all")}
        >
          <List.Dropdown.Item title="All Kinds" value="all" />
          <List.Dropdown.Section>
            {KINDS.map((k) => (
              <List.Dropdown.Item key={k} title={KIND_LABEL[k]} value={k} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Searching…" : "No Integrations Found"}
        description={isLoading ? undefined : "Try a different domain or service name."}
      />
      {results.map((item) => (
        <List.Item
          key={item.domain}
          title={item.name || item.domain}
          subtitle={item.name && item.name !== item.domain ? item.domain : undefined}
          icon={{
            source: logoUrl(item.domain),
            fallback: Icon.Globe,
            mask: Image.Mask.RoundedRectangle,
          }}
          accessories={item.kinds.map((k) => ({ tag: KIND_LABEL[k] }))}
          actions={
            <ActionPanel>
              <Action.Push
                title="Inspect Surfaces"
                icon={Icon.Sidebar}
                target={<SurfaceDetail domain={item.domain} />}
              />
              <Action.OpenInBrowser title="Open on Integrations.sh" url={domainPageUrl(item.domain)} />
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Domain"
                  content={item.domain}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
                <Action.CopyToClipboard
                  title="Copy Surface API URL"
                  content={surfaceApiUrl(item.domain)}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard
                  title="Copy Domain Page URL"
                  content={domainPageUrl(item.domain)}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
