import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { errorMessage, getClient } from "./rerout";

const PAGE_SIZE = 100;

export default function MyLinks() {
  const client = getClient();
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate, pagination } = usePromise(
    () =>
      async ({ cursor }: { cursor?: number }) => {
        const result = await client.links.list({ limit: PAGE_SIZE, cursor });
        return {
          data: result.links,
          hasMore: result.next_cursor !== null,
          cursor: result.next_cursor ?? undefined,
        };
      },
    [],
  );

  // The API has no server-side search, so while the user is searching keep
  // fetching pages until every link is loaded and can be matched locally.
  useEffect(() => {
    if (searchText && pagination?.hasMore && !isLoading) {
      pagination.onLoadMore();
    }
  }, [searchText, pagination?.hasMore, isLoading]);

  const query = searchText.trim().toLowerCase();
  const links = (data ?? []).filter(
    (link) =>
      !query ||
      [
        link.short_url,
        link.code,
        link.target_url,
        ...(link.tags ?? []).map((t) => t.name),
      ].some((value) => value.toLowerCase().includes(query)),
  );

  async function deleteLink(code: string) {
    const confirmed = await confirmAlert({
      title: `Delete "${code}"?`,
      message: "The short URL stops redirecting. This cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting…",
    });
    try {
      await client.links.delete(code);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${code}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete";
      toast.message = errorMessage(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search links…"
    >
      {links.map((link) => (
        <List.Item
          key={link.code}
          icon={link.is_active ? Icon.Link : Icon.MinusCircle}
          title={link.short_url}
          subtitle={link.target_url}
          accessories={[
            ...(link.tags ?? []).map((t) => ({ tag: t.name })),
            ...(link.is_active ? [] : [{ text: "inactive" }]),
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Short URL"
                content={link.short_url}
              />
              <Action.OpenInBrowser
                title="Open Destination"
                url={link.target_url}
              />
              <Action.OpenInBrowser
                title="Open QR Code"
                icon={Icon.Image}
                url={client.qr.url(link.code)}
              />
              <Action
                title="Delete Link"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteLink(link.code)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
      {query ? (
        <List.EmptyView
          title={isLoading ? "Searching…" : "No Matching Links"}
          description={
            isLoading ? "" : `Nothing matches "${searchText.trim()}".`
          }
        />
      ) : (
        <List.EmptyView
          title="No Links Yet"
          description="Create one with the Create Short Link command."
        />
      )}
    </List>
  );
}
