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
import { errorMessage, getClient } from "./rerout";

export default function MyLinks() {
  const client = getClient();
  const { data, isLoading, revalidate } = usePromise(async () => {
    const result = await client.links.list({ limit: 100 });
    return result.links;
  });

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
    <List isLoading={isLoading} searchBarPlaceholder="Filter links…">
      {(data ?? []).map((link) => (
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
      <List.EmptyView
        title="No Links Yet"
        description="Create one with the Create Short Link command."
      />
    </List>
  );
}
