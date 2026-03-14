import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { getServerSummary } from "./api/smithery";
import { McpInstalledItem } from "./components/mcp/McpInstalledItem";
import { useSmitheryCheck } from "./hooks/useSmitheryCheck";
import { listInstalledLocalItems } from "./utils/local-installs";

type FilterValue = "all" | `client:${string}`;

export default function ManageInstalled() {
  const {
    isLoading: checkingSmithery,
    error: smitheryError,
    retry: retrySmithery,
  } = useSmitheryCheck();
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(listInstalledLocalItems, [], {
    keepPreviousData: true,
  });

  const [filter, setFilter] = useState<FilterValue>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const summaryAbortable = useRef<AbortController>(null);
  const toggleDetail = () => setIsShowingDetail((previous) => !previous);
  const selectedQualifiedName = useMemo(() => {
    if (!selectedItemId?.startsWith("mcp:")) {
      return undefined;
    }

    const match = selectedItemId.match(/^mcp:[^:]+:(.+)$/);
    return match?.[1];
  }, [selectedItemId]);
  const { data: selectedSummary, isLoading: isLoadingSelectedSummary } =
    useCachedPromise(
      async (qualifiedName?: string) => {
        if (!qualifiedName) {
          return null;
        }

        return getServerSummary(qualifiedName);
      },
      [selectedQualifiedName],
      {
        keepPreviousData: true,
        abortable: summaryAbortable,
      },
    );

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return data;
    }

    const client = filter.replace("client:", "");
    return data.filter((item) => item.client === client);
  }, [data, filter]);

  const mcpByClient = useMemo(() => {
    const map = new Map<string, { count: number; title: string }>();
    for (const item of data) {
      const existing = map.get(item.client);
      map.set(item.client, {
        count: (existing?.count ?? 0) + 1,
        title: item.clientTitle,
      });
    }
    return map;
  }, [data]);

  if (smitheryError) {
    return (
      <Detail
        markdown={`# Smithery CLI Required\n\n${smitheryError.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={retrySmithery}
              icon={Icon.RotateClockwise}
            />
            <Action.OpenInBrowser
              title="Install Smithery CLI"
              url="https://smithery.ai/"
              icon={Icon.Download}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error && data.length === 0) {
    return (
      <Detail
        markdown={`# Failed to load installed MCP servers\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={revalidate}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={checkingSmithery || isLoading}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Search installed MCP servers..."
      isShowingDetail={filteredItems.length > 0 && isShowingDetail}
      searchBarAccessory={
        <List.Dropdown
          value={filter}
          onChange={(value) => setFilter(value as FilterValue)}
          storeValue
          tooltip="Filter installed MCP servers"
        >
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item value="all" title={`All (${data.length})`} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="MCP Clients">
            {[...mcpByClient.entries()].map(([client, { count, title }]) => (
              <List.Dropdown.Item
                key={client}
                value={`client:${client}`}
                title={`${title} (${count})`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Installed MCP Servers"
          description="Install MCP servers first, then manage them here."
          icon={Icon.Box}
        />
      ) : (
        <List.Section
          title="Installed MCP"
          subtitle={`${filteredItems.length}`}
        >
          {filteredItems.map((item) => (
            <McpInstalledItem
              key={`mcp:${item.client}:${item.id}`}
              item={item}
              summary={
                selectedQualifiedName === item.id ? selectedSummary : null
              }
              summaryLoading={
                selectedQualifiedName === item.id && isLoadingSelectedSummary
              }
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
              onUpdated={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
