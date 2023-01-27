import {
  List,
  Icon,
  Toast,
  showToast,
  ActionPanel,
  Action,
  getPreferenceValues,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { deleteFileByHash, getPinned } from "./api";

interface Preferences {
  PINATA_JWT: string;
  SUBMARINE_KEY: string;
  GATEWAY: string;
}

const preferences = getPreferenceValues<Preferences>();
const GATEWAY = preferences.GATEWAY;

export default function Command() {
  const { data, error, isLoading, mutate, revalidate } = getPinned();

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const deleteFile = async (hash) => {
    const options: Alert.Options = {
      title: "Delete File",
      message: "Are you sure you want to delete this file?",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting File" });

      try {
        await deleteFileByHash(hash);
        toast.style = Toast.Style.Success;
        toast.title = "File Deleted!";
        revalidate();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed Deleting File";
        console.log(error);
      }
    } else {
      console.log("cancelled");
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={{ source: "loading/loading.gif" }}
        title="Retrieving your files"
        description="This will only take a few seconds"
      />

      {data?.rows &&
        data.rows.map((item) => (
          <List.Item
            key={item.id}
            title={item.metadata.name}
            subtitle={item.ipfs_pin_hash}
            accessories={[{ text: formatBytes(item.size) }, { date: new Date(item.date_pinned) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${GATEWAY}/ipfs/${item.ipfs_pin_hash}`} />
                <Action.CopyToClipboard title="Copy CID to Clipboard" content={item.cid} icon={Icon.CopyClipboard} />
                <Action.OpenInBrowser
                  url={`${GATEWAY}/ipfs/${item.ipfs_pin_hash}?stream=true`}
                  title="Stream Video File"
                  icon={Icon.Play}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action
                  style={Action.Style.Destructive}
                  title="Delete File"
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => deleteFile(item.ipfs_pin_hash)}
                  icon={Icon.Trash}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
