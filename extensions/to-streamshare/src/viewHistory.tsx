import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getUploadHistory, removeUploadRecord, clearUploadHistory, type UploadRecord } from "./shared/storage";
import axios from "axios";

export default function Command() {
  const { data: history, revalidate } = useUploadHistory();

  return (
    <List>
      {history.length === 0 ? (
        <List.EmptyView title="No Uploads Found" />
      ) : (
        history.map((record) => (
          <List.Item
            key={record.downloadUrl}
            title={record.sourceFileName}
            subtitle={new Date(record.timestamp).toLocaleString()}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Download URL" content={record.downloadUrl} />
                <Action.OpenInBrowser icon={Icon.Download} title="Download File" url={record.downloadUrl} />
                <Action
                  title="Check Status"
                  icon={Icon.Eye}
                  onAction={async () => {
                    try {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Checking file status...",
                      });

                      await axios.head(record.downloadUrl);

                      toast.style = Toast.Style.Success;
                      toast.title = "File is available";
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "File is no longer available",
                      });
                    }
                  }}
                />
                <Action
                  title="Delete File from Streamshare"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={async () => {
                    try {
                      await axios.get(record.deletionUrl);
                      await removeUploadRecord(record.downloadUrl);
                      await revalidate();
                      await showToast({
                        style: Toast.Style.Success,
                        title: "File deleted successfully",
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to delete file",
                        message: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }}
                />
                <Action
                  title="Remove File from History"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={async () => {
                    await removeUploadRecord(record.downloadUrl);
                    await revalidate();
                  }}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  onAction={async () => {
                    try {
                      await clearUploadHistory();
                      await revalidate();
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Upload history cleared",
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to clear history",
                        message: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function useUploadHistory() {
  const [data, setData] = useState<UploadRecord[]>([]);

  async function fetchHistory() {
    const history = await getUploadHistory();
    setData(history);
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  return { data, revalidate: fetchHistory };
}
