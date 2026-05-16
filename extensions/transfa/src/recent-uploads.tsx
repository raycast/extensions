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
import { useEffect, useState } from "react";
import { UploadResult, deleteUpload, listUploads } from "./api";
import { formatBytes, formatExpiry } from "./utils";

interface Preferences {
  apiKey: string;
}

export default function RecentUploadsCommand() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setError("API key required — add one in extension preferences to list uploads");
      setIsLoading(false);
      return;
    }
    listUploads(apiKey)
      .then(setUploads)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [apiKey]);

  async function handleDelete(upload: UploadResult) {
    const confirmed = await confirmAlert({
      title: "Delete upload?",
      message: `"${upload.filename}" will be permanently removed.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deleteUpload(upload.id, apiKey);
      setUploads((prev) => prev.filter((u) => u.id !== upload.id));
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Delete failed", message: String(err) });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter uploads…">
      {uploads.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Upload}
          title="No uploads yet"
          description="Use the 'Upload File' command to get started"
        />
      ) : (
        uploads.map((upload) => {
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
