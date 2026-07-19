import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { api, type Workspace } from "./api";

type Entity = {
  type: "task" | "project" | "document";
  id: string;
  title: string;
  identifier?: string;
  status?: string;
  productIdentifier?: string;
  url: string;
};

export default function SearchAlabasta() {
  const [query, setQuery] = useState("");
  const { data: workspaces } = useCachedPromise(() =>
    api<Workspace[]>("workspaces"),
  );
  const { data: selectedWorkspace, revalidate: revalidateWorkspace } =
    useCachedPromise(() => LocalStorage.getItem<string>("workspaceId"));
  const {
    data: entities,
    isLoading,
    revalidate,
  } = useCachedPromise(
    () =>
      selectedWorkspace
        ? api<Entity[]>("search", { workspaceId: selectedWorkspace, query })
        : Promise.resolve([]),
    [selectedWorkspace, query],
  );

  async function selectWorkspace(workspaceId: string) {
    await LocalStorage.setItem("workspaceId", workspaceId);
    await revalidateWorkspace();
    await revalidate();
  }

  return (
    <List
      isLoading={isLoading || !workspaces}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search tasks, issues, projects, and documents…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Workspace"
          value={selectedWorkspace}
          onChange={selectWorkspace}
        >
          {workspaces?.map((item) => (
            <List.Dropdown.Item
              key={item.id}
              value={item.id}
              title={item.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!selectedWorkspace && (
        <List.EmptyView
          title="Choose a workspace"
          description="Select a workspace to search your Alabasta work."
        />
      )}
      {entities?.map((item) => (
        <List.Item
          key={`${item.type}-${item.id}`}
          title={item.title}
          subtitle={item.identifier ?? item.type}
          accessories={[{ text: item.status ?? "" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Alabasta" url={item.url} />
              <Action.CopyToClipboard
                title="Copy Alabasta Link"
                content={item.url}
              />
              <Action title="Refresh" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
