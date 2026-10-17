import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BaseUrl, buildHeaders, FolderContentsResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { TYPE_COLOR, TYPE_LABEL, TYPE_ORDER } from "../utils/contentTypes";
import { formatFullDate, formatRelativeDate } from "../utils/formatting";
import { FolderContents } from "./FolderContents";

export function FolderRow({ folder }: { folder: { id: string; title: string; created_at: string; url?: string } }) {
  const { token } = useAuth();
  const { push } = useNavigation();

  // Folders don't report child counts directly, so this counts types among the first page of
  // contents (capped at 100 items) — good enough for the accessory, not a precise total.
  const { data, isLoading } = useFetch(BaseUrl + `/v1/folders/${folder.id}/contents?page[limit]=100`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return FolderContentsResponse.parse(json);
    },
  });

  const items = data?.data ?? [];
  const suffix = data?.page.has_more ? "+" : "";

  const typePills = TYPE_ORDER.map((type) => {
    const count = items.filter((item) => item.type === type).length;
    if (count === 0) return null;
    return {
      tag: {
        value: `${count}${suffix} ${TYPE_LABEL[type]}${count === 1 ? "" : "s"}`,
        color: TYPE_COLOR[type],
      },
    };
  }).filter((pill): pill is NonNullable<typeof pill> => pill !== null);

  const accessories: List.Item.Props["accessories"] = isLoading
    ? [{ text: "Loading..." }]
    : [...typePills, { text: formatRelativeDate(folder.created_at), tooltip: formatFullDate(folder.created_at) }];

  return (
    <List.Item
      title={folder.title}
      icon={Icon.Folder}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open Folder"
            icon={Icon.ArrowRight}
            onAction={() => push(<FolderContents folderId={folder.id} title={folder.title} />)}
          />
          <Action.OpenInBrowser
            url={folder.url ?? `https://dovetail.com/folders/${folder.id}`}
            title="Open in Dovetail"
          />
        </ActionPanel>
      }
    />
  );
}
