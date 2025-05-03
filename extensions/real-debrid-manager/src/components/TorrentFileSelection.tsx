import { useReducer } from "react";
import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { TorrentFile, TorrentItemDataExtended } from "../schema";
import { formatFileSize } from "../utils";
import { reducer as fileSelectionReducer } from "../reducers";
import { requestSelectTorrentFiles } from "../api";

type TorrentFileSelectionProps = {
  torrentItemData: TorrentItemDataExtended;
  revalidate?: () => void;
};

export const TorrentFileSelection: React.FC<TorrentFileSelectionProps> = ({ torrentItemData, revalidate }) => {
  const [torrentFiles, dispatch] = useReducer(fileSelectionReducer, torrentItemData?.files as TorrentFile[]);

  const handleFileSelection = (id: number) => {
    dispatch({ type: "toggle", id });
  };
  const handleSelectAll = () => {
    dispatch({ type: "select_all" });
  };
  const handleDeselectAll = () => {
    dispatch({ type: "deselect_all" });
  };

  const handleSubmit = async () => {
    const selectedFiles = torrentFiles.filter((file) => file.selected);
    const files = selectedFiles.map((file) => file.id).join(",");
    try {
      await requestSelectTorrentFiles(torrentItemData.id, files);
      await showToast(Toast.Style.Success, "Files Selected");
      revalidate && revalidate();
      popToRoot();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to select files" + error);
    }
  };

  return (
    <List>
      {torrentFiles.map((torrentFile) => (
        <List.Item
          icon={torrentFile.selected ? Icon.Checkmark : Icon.Circle}
          key={torrentFile.id}
          title={torrentFile.path.slice(1)}
          accessories={[
            {
              text: formatFileSize(torrentFile.bytes),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={torrentFile?.selected ? "Deselect" : "Select"}
                icon={torrentFile?.selected ? Icon.Circle : Icon.Checkmark}
                onAction={() => handleFileSelection(torrentFile.id)}
              />
              <Action icon={Icon.Bolt} title="Confirm Selection" onAction={handleSubmit} />
              <Action
                title={torrentFiles?.some((file) => file?.selected) ? "Deselect All" : "Select All"}
                icon={torrentFiles?.some((file) => file?.selected) ? Icon.Circle : Icon.CheckCircle}
                shortcut={{
                  key: "a",
                  modifiers: ["opt", "ctrl"],
                }}
                onAction={torrentFiles?.some((file) => file?.selected) ? handleDeselectAll : handleSelectAll}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default TorrentFileSelection;
