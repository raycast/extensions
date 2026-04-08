import { Action, ActionPanel, Icon, Keyboard, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import axios from "axios";
import { useEffect, useState } from "react";
import { baseUrl, headers, useCollections } from "./hooks";
import { ApiResponse, Link } from "./interfaces";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [collectionId, setCollectionId] = useState("");

  const { isLoading: isLoadingCollections, data: collections } = useCollections();

  // NOTE: GET /api/v1/links is deprecated per Linkwarden API docs.
  // Migrate to GET /api/v1/search when feasible.
  // See: https://docs.linkwarden.app/api/retrieve-a-list-of-links
  const searchParams = new URLSearchParams({
    sort: "0",
    searchQueryString: searchText,
    searchByName: "true",
    searchByUrl: "true",
    searchByDescription: "true",
    searchByTags: "true",
    searchByTextContent: "true",
  });
  if (collectionId) {
    searchParams.set("collectionId", collectionId);
  }

  const {
    isLoading: isLoadingLinks,
    data,
    error: linksError,
    revalidate,
  } = useFetch(`${baseUrl}links?${searchParams.toString()}`, {
    headers,
    mapResult(result: ApiResponse<Link[]>) {
      return {
        data: result.response,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  useEffect(() => {
    if (linksError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch links",
        message: linksError.message,
      });
    }
  }, [linksError]);

  const deleteLink = async (id: number) => {
    try {
      await axios.delete(`${baseUrl}links/${id}`, {
        headers,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Link deleted successfully",
      });

      // Revalidate the data to reflect the deletion
      revalidate();
    } catch (error) {
      console.error("Error deleting link:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete link",
        message: (error as Error).message,
      });
    }
  };

  const isLoading = isLoadingLinks || isLoadingCollections;
  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search for Links"
      searchBarAccessory={
        <List.Dropdown tooltip="Collection" onChange={setCollectionId}>
          <List.Dropdown.Item title="All" value="" />
          {collections.map((collection) => (
            <List.Dropdown.Item
              key={collection.id}
              icon={{ source: Icon.Folder, tintColor: collection.color }}
              title={`${collection.name} (${collection._count.links}) [${collection.parent?.name ? `${collection.parent.name} > ` : ""}${collection.name}]`}
              value={collection.id.toString()}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && !data.length && (
        <>
          {!collectionId ? (
            <EmptyView title="You Haven't Created Any Links Yet" />
          ) : (
            <EmptyView title="You Haven't Created Any Links Here" />
          )}
        </>
      )}
      {data.map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.name}
            subtitle={item.description}
            icon={getFavicon(item.url)}
            accessories={[
              { tag: item.collection.name, icon: { source: Icon.Folder, tintColor: item.collection.color } },
              { date: new Date(item.updatedAt), icon: Icon.Calendar },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser icon={getFavicon(item.url)} title="Open in Browser" url={item.url} />
                <Action.CopyToClipboard title="Copy URL" content={item.url} />
                <Action
                  title="Delete Link"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => deleteLink(item.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action
                  icon={Icon.Plus}
                  title="Create New Link"
                  onAction={async () => await launchCommand({ name: "add", type: LaunchType.UserInitiated })}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function EmptyView({ title }: { title: string }) {
  return (
    <List.EmptyView
      icon={Icon.Rocket}
      title={title}
      description="Start your journey by creating a new Link!"
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Plus}
            title="Create New Link"
            onAction={async () => await launchCommand({ name: "add", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
