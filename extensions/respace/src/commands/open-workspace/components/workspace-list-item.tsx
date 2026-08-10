import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getWorkspaceDeeplink } from "../../../core/deeplink/deeplink";
import type { Workspace } from "../../../types/workspace";
import { getWorkspaceIcon } from "../../manage-workspaces/constants/workspace-icons";

interface WorkspaceListItemProps {
  workspace: Workspace;
  onOpen: (workspace: Workspace) => void;
  onClose?: (workspaceId: string) => void;
  isOpened?: boolean;
}

/**
 * Reusable list item component for displaying a workspace
 */
export function WorkspaceListItem({ workspace, onOpen, onClose, isOpened = false }: WorkspaceListItemProps) {
  const itemCount = workspace.items.length;
  const itemLabel = `${itemCount} item${itemCount !== 1 ? "s" : ""}`;

  // Find first file or folder item for "Show in Finder" action
  const fileOrFolderItem = workspace.items.find((item) => item.type === "file" || item.type === "folder");

  return (
    <List.Item
      key={isOpened ? `${workspace.id}-opened` : workspace.id}
      icon={{ source: getWorkspaceIcon(workspace.icon) }}
      title={workspace.name}
      subtitle={workspace.description}
      accessories={[{ text: itemLabel, icon: Icon.Document }]}
      actions={
        <ActionPanel>
          {isOpened && onClose ? (
            // Actions for opened workspace
            <>
              <Action title="Close Workspace" icon={Icon.XMarkCircle} onAction={() => onClose(workspace.id)} />
              <Action.CopyToClipboard
                title="Copy Workspace Info"
                content={JSON.stringify(workspace, null, 2)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          ) : (
            // Actions for closed workspace
            <>
              <Action title="Open Workspace" icon={Icon.Rocket} onAction={() => onOpen(workspace)} />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{
                  name: workspace.name,
                  link: getWorkspaceDeeplink(workspace.name),
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
              />
              {fileOrFolderItem && <Action.ShowInFinder title="Show in Finder" path={fileOrFolderItem.path} />}
              <Action.CopyToClipboard
                title="Copy Workspace Info"
                content={JSON.stringify(workspace, null, 2)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
