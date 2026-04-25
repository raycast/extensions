import type React from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { reportError } from "@/lib/errors";
import { deleteUrl, setUrlStatus } from "@/api/urls";
import type { UrlListItem } from "@/schemas/url";
import { EditLinkView } from "@/components/edit-link";
import { LinkAnalytics } from "@/components/link-analytics";
import { LinkQrView } from "@/components/link-qr";

interface LinkActionsProps {
  link: UrlListItem;
  onMutated: () => void;
  children?: React.ReactElement | React.ReactElement[];
}

export function LinkActions({ link, onMutated, children }: LinkActionsProps) {
  const { push } = useNavigation();
  const isActive = link.status === "ACTIVE";

  const handleToggleStatus = async () => {
    try {
      await setUrlStatus(link.id, isActive ? "INACTIVE" : "ACTIVE");
      onMutated();
    } catch (err) {
      await reportError(err);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete this link?",
      message: `${link.alias} and all of its analytics will be permanently removed.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteUrl(link.id);
      onMutated();
    } catch (err) {
      await reportError(err);
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Short URL"
          content={link.short_url}
        />
        <Action.OpenInBrowser title="Open Short URL" url={link.short_url} />
        {link.long_url ? (
          <Action.OpenInBrowser
            title="Open Long URL"
            url={link.long_url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="View Analytics"
          icon={Icon.BarChart}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={() => push(<LinkAnalytics link={link} />)}
        />
        <Action
          title="Edit Link"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() =>
            push(<EditLinkView link={link} onMutated={onMutated} />)
          }
        />
        <Action
          title="Show Qr Code"
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
          onAction={() => push(<LinkQrView link={link} />)}
        />
        <Action.CopyToClipboard
          title="Copy as Markdown"
          content={`[${link.alias ?? link.id}](${link.short_url})`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>

      {children}
      <ActionPanel.Section>
        <Action
          title={isActive ? "Deactivate Link" : "Activate Link"}
          icon={isActive ? Icon.CircleDisabled : Icon.Checkmark}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={handleToggleStatus}
        />
        <Action
          title="Delete Link"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={handleDelete}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
