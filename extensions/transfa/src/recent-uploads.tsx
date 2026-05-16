import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  confirmAlert,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { UploadResult, deleteUpload, listUploads } from "./api";
import { formatBytes, formatExpiry } from "./utils";

export default function RecentUploadsCommand() {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { data: uploads, isLoading, error, revalidate } = useCachedPromise(
    (key: string) => listUploads(key),
    [apiKey],
    { execute: !!apiKey }
  );

  async function handleDelete(upload: UploadResult) {
    const confirmed = await confirmAlert({
      title: "Delete upload?",
      message: `"${upload.filename}" will be permanently removed.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deleteUpload(upload.id, apiKey);
      revalidate();
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Delete failed", message: String(err) });
    }
  }

  if (!apiKey) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Key, tintColor: Color.Orange }}
          title="API Key Required"
          description="Add your transfa API key in Raycast Preferences → Extensions → Transfa"
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={error.message}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter uploads…">
      {!uploads?.length && !isLoading ? (
        <List.EmptyView
          icon={Icon.Upload}
          title="No uploads yet"
          description="Use the 'Upload File' command to get started"
        />
      ) : (
        (uploads ?? []).map((upload) => {
          const expiry = formatExpiry(upload.expires_at);
          const expired = expiry === "Expired";
          return (
            <List.Item
              key={upload.id}
              icon={{ source: Icon.Document, tintColor: expired ? Color.SecondaryText : Color.Blue }}
              title={upload.filename}
              subtitle={formatBytes(upload.bytes)}
              accessories={[
                {
                  text: expiry,
                  icon: { source: Icon.Clock, tintColor: expired ? Color.Red : Color.SecondaryText },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Link"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(upload.url);
                      await showToast({ style: Toast.Style.Success, title: "Link copied!", message: upload.url });
                    }}
                  />
                  <Action.OpenInBrowser title="Open Share Page" url={upload.url} />
                  <Action
                    title="Copy Direct Download URL"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={async () => {
                      await Clipboard.copy(upload.agent_link);
                      await showToast({ style: Toast.Style.Success, title: "Direct URL copied!" });
                    }}
                  />
                  <Action title="Open Direct Download" icon={Icon.Download} onAction={() => open(upload.agent_link)} />
                  <ActionPanel.Section />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(upload)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
