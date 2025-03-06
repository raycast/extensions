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
import { deleteFileByHash, getPinned, PinnedResponse } from "./api";
import { formatBytes } from "./utils";

interface Preferences {
  PINATA_JWT: string;
  GATEWAY: string;
}

const preferences = getPreferenceValues<Preferences>();
const GATEWAY = preferences.GATEWAY;

export default function Command() {
  const { data, isLoading, mutate } = getPinned();

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
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting File",
      });

      try {
        deleteFileByHash(hash);
        await mutate(deleteFileByHash(hash), {
          optimisticUpdate(data: PinnedResponse) {
            return {
              ...data,
              rows: data.rows.filter((row) => row.ipfs_pin_hash !== hash),
            };
          },
        });

        toast.style = Toast.Style.Success;
        toast.title = "File Deleted!";
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
      {data ? (
        data?.rows && data.rows.length === 0 ? (
          <List.EmptyView icon={{ source: "pinnie.png" }} title="No files currently pinned, upload something first!" />
        ) : (
          data.rows.map((item) => (
            <List.Item
              key={item.id}
              title={item.metadata.name ? item.metadata.name : "null"}
              subtitle={item.ipfs_pin_hash}
              accessories={[{ text: formatBytes(item.size) }, { date: new Date(item.date_pinned) }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`${GATEWAY}/ipfs/${item.ipfs_pin_hash}`} />
                  <Action.CopyToClipboard title="Copy CID to Clipboard" content={item.cid} icon={Icon.CopyClipboard} />
                  <Action
                    style={Action.Style.Destructive}
                    title="Delete File"
                    onAction={() => deleteFile(item.ipfs_pin_hash)}
                    icon={Icon.Trash}
                  />
                </ActionPanel>
              }
            />
          ))
        )
      ) : (
        <List.EmptyView title="Request failed, check API Key!" />
      )}
    </List>
  );
}
