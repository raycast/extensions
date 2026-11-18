import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { BaseUrl, buildHeaders, FolderContentsResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { TYPE_ICON, TYPE_LABEL, TYPE_PATH } from "../utils/contentTypes";
import { formatFullDate, formatRelativeDate } from "../utils/formatting";
import { ChannelRow } from "./ChannelRow";
import { FolderRow } from "./FolderRow";
import { ProjectRow } from "./ProjectRow";

export function FolderContents({ folderId, title }: { folderId: string; title: string }) {
  const { token } = useAuth();

  const { data, isLoading } = useFetch(BaseUrl + `/v1/folders/${folderId}/contents?page[limit]=100`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return FolderContentsResponse.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load folder" });
    },
  });

  const items = data?.data ?? [];

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter this folder...">
      <List.EmptyView icon={Icon.Folder} title="This folder is empty" />
      {items.map((item) => {
        if (item.type === "folder") {
          return <FolderRow key={item.id} folder={{ ...item, url: item.url ?? undefined }} />;
        }
        if (item.type === "project") {
          return <ProjectRow key={item.id} project={{ ...item, url: item.url ?? undefined }} />;
        }
        if (item.type === "channel") {
          return <ChannelRow key={item.id} channel={{ ...item, url: item.url ?? undefined }} />;
        }

        const url = item.url ?? `https://dovetail.com/${TYPE_PATH[item.type]}/${item.id}`;
        return (
          <List.Item
            key={item.id}
            title={item.title || "Untitled"}
            icon={TYPE_ICON[item.type]}
            accessories={[
              { tag: TYPE_LABEL[item.type] },
              { text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} title="Open in Dovetail" />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
