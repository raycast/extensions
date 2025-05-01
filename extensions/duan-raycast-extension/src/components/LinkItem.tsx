import { List, ActionPanel, Action, Icon, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import type { Link } from "../types";
import type { Preferences } from "../types";
import { LinkDetail } from "./LinkDetail";
import { deleteLink } from "../services/api";

interface LinkItemProps {
  link: Link;
  onRefresh: () => void;
}

export const LinkItem = ({ link, onRefresh }: LinkItemProps) => {
  const BASE_URL = getPreferenceValues<Preferences>().host;
  const shortUrl = `${BASE_URL}/${link.short_code}`;

  const handleDelete = async () => {
    if (
      await confirmAlert({
        title: "Delete Link",
        message: `Are you sure you want to delete ${link.short_code}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      })
    ) {
      await deleteLink(link.short_code);
      onRefresh(); // 删除后重新获取列表
    }
  };

  return (
    <List.Item
      icon={link.is_enabled ? undefined : Icon.EyeDisabled}
      title={link.short_code}
      subtitle={link.original_url}
      accessories={[
        {
          text: link.description || "",
        },
        {
          text: link.visit_count.toString(),
          icon: Icon.Footprints,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Short Link" content={shortUrl} />
          <Action.Push icon={Icon.Paragraph} title="Edit" target={<LinkDetail link={link} onRefresh={onRefresh} />} />
          <Action
            icon={Icon.Trash}
            title="Delete Link"
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
};
