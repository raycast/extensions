import { Action, ActionPanel, Icon, Keyboard, List, Toast, closeMainWindow, open, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DocListItem } from "./components/doc-list-item";
import { withAuth } from "./features/with-auth";
import { withQuery } from "./features/query-provider";
import { getErrorMessage, logout } from "./services/client";
import {
  createDocument,
  CreateType,
  fetchRecentDocs,
  RecentDocsResponse,
  removeRecentDocument,
  searchDocs,
  SearchDocsResponse,
} from "./services/docs";
import { preference } from "./utils/config";
import { StorageKey } from "./utils/storage";

function SearchDocs() {
  const [searchText, setSearchText] = useState("");
  const [cachedRecent, setCachedRecent] = useCachedState<RecentDocsResponse | null>(StorageKey.DocsRecentList, null);

  const { data, error, isFetching, refetch } = useQuery<SearchDocsResponse | RecentDocsResponse>({
    queryKey: ["documents", searchText],
    queryFn: async ({ signal }) => {
      if (searchText.trim()) return searchDocs(searchText.trim(), 15, signal);
      const recent = await fetchRecentDocs(preference.recentListCount, signal);
      setCachedRecent(recent);
      return recent;
    },
    placeholderData: (previousData) => keepPreviousData(previousData) || cachedRecent || undefined,
  });

  useEffect(() => {
    if (!error) return;
    void showToast({
      style: Toast.Style.Failure,
      title: "Could Not Load Documents",
      message: getErrorMessage(error),
    });
  }, [error]);

  const handleCreate = async (type: CreateType) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${createTypeLabel(type)}...`,
    });

    try {
      const created = await createDocument(type, searchText.trim());
      toast.style = Toast.Style.Success;
      toast.title = `${createTypeLabel(type)} created`;
      toast.message = created.title;
      await closeMainWindow();
      await open(created.url);
      if (!searchText) await refetch();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could Not Create ${createTypeLabel(type)}`;
      toast.message = getErrorMessage(error);
    }
  };

  const handleRemoveRecent = async (token: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing from recent files..." });
    try {
      await removeRecentDocument(token);
      toast.style = Toast.Style.Success;
      toast.title = "Removed from Recent Files";
      await refetch();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Remove File";
      toast.message = getErrorMessage(error);
    }
  };

  const isRecent = data ? "nodes" in data.entities : false;
  const tokens = data ? (isRecent ? (data as RecentDocsResponse).node_list : (data as SearchDocsResponse).tokens) : [];

  return (
    <List isLoading={isFetching} searchBarPlaceholder="Search documents..." onSearchTextChange={setSearchText} throttle>
      {tokens.map((token) => {
        if (isRecent) {
          const recent = data as RecentDocsResponse;
          const document = recent.entities.nodes[token];
          if (!document) return null;

          return (
            <DocListItem
              key={token}
              document={document}
              owner={recent.entities.users?.[document.owner_id || ""]}
              additionalActions={
                <>
                  <CreateActions onCreate={handleCreate} />
                  <Action
                    title="Remove from Recent Files"
                    icon={Icon.Trash}
                    shortcut={{ key: "x", modifiers: ["ctrl"] }}
                    onAction={() => void handleRemoveRecent(token)}
                  />
                  <RefreshAction onRefresh={refetch} />
                  <LogoutAction />
                </>
              }
            />
          );
        }

        const search = data as SearchDocsResponse;
        const document = search.entities.objs[token];
        if (!document) return null;

        return (
          <DocListItem
            key={token}
            document={document}
            owner={search.entities.users?.[document.owner_id || ""]}
            additionalActions={
              <>
                <CreateActions onCreate={handleCreate} />
                <RefreshAction onRefresh={refetch} />
                <LogoutAction />
              </>
            }
          />
        );
      })}
      <List.EmptyView
        title={searchText ? "No Documents Found" : "No Recent Documents"}
        description={searchText ? `No results for “${searchText}”` : "Files you visit in Lark will appear here."}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <CreateActions onCreate={handleCreate} />
            <RefreshAction onRefresh={refetch} />
            <LogoutAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

function CreateActions({ onCreate }: { onCreate: (type: CreateType) => Promise<void> }) {
  return (
    <>
      <Action
        title="Create Document"
        icon={Icon.Document}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() => void onCreate(CreateType.Docx)}
      />
      <Action
        title="Create Spreadsheet"
        icon={Icon.BarChart}
        shortcut={{ key: "n", modifiers: ["cmd", "shift"] }}
        onAction={() => void onCreate(CreateType.Sheet)}
      />
      <Action
        title="Create Slides"
        icon={Icon.Desktop}
        shortcut={{ key: "n", modifiers: ["cmd", "alt"] }}
        onAction={() => void onCreate(CreateType.Slides)}
      />
    </>
  );
}

function RefreshAction({ onRefresh }: { onRefresh: () => unknown }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => void onRefresh()}
    />
  );
}

function LogoutAction() {
  return <Action title="Logout" icon={Icon.Logout} onAction={() => void logout()} />;
}

function createTypeLabel(type: CreateType): string {
  switch (type) {
    case CreateType.Sheet:
      return "Spreadsheet";
    case CreateType.Slides:
      return "Slides";
    default:
      return "Document";
  }
}

export default withAuth(withQuery(SearchDocs));
