import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import path from "path";
import { goToRoot } from "../utils/helpers";
import RefreshAction from "./RefreshAction";

interface FolderListItemProps {
  folder: string;
  rootFolder: string;
  onOpen: () => void;
  onRefresh: () => void;
}
function FolderListItem({ folder, rootFolder, onOpen, onRefresh }: FolderListItemProps) {
  return (
    <List.Item
      key={folder}
      icon={Icon.Folder}
      title={path.basename(folder)}
      subtitle={path.relative(rootFolder, folder)}
      keywords={[path.basename(folder), path.relative(rootFolder, folder)]}
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowRight} title="Open" onAction={onOpen} />
          <Action
            icon={Icon.Folder}
            title="Open in Explorer"
            onAction={async () => {
              await open(folder);
              await goToRoot();
            }}
          />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

export default FolderListItem;
