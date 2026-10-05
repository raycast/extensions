import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import MountOperation from "./operations/mount";
import CopyOperation from "./operations/copy";
import CopyFileOperation from "./operations/copyfile";
import CopyUrlOperation from "./operations/copyurl";
import SyncOperation from "./operations/sync";
import MoveOperation from "./operations/move";
import MoveFileOperation from "./operations/movefile";
import DeleteOperation from "./operations/delete";
import DeleteFileOperation from "./operations/deletefile";
import PurgeOperation from "./operations/purge";
import { OPERATION_DESCRIPTIONS } from "./lib/constants";

type RemoteLaunchProps = LaunchProps<{ arguments: Arguments.RunOperation }> & {
  launchContext?: {
    remote?: string;
  };
};

export default function Command({ launchContext }: RemoteLaunchProps) {
  const remote = launchContext?.remote ?? "";

  return (
    <List searchBarPlaceholder="Search operations" isShowingDetail>
      <List.Section title="Operations">
        <List.Item
          title="mount"
          detail={<List.Item.Detail markdown={`### Mount\n${OPERATION_DESCRIPTIONS.Mount}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open Mount" target={<MountOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="copy"
          detail={<List.Item.Detail markdown={`### Copy\n${OPERATION_DESCRIPTIONS.Copy}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open Copy" target={<CopyOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="copyfile"
          detail={<List.Item.Detail markdown={`### Copy\n${OPERATION_DESCRIPTIONS.Copy}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open CopyFile" target={<CopyFileOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="copyurl"
          detail={<List.Item.Detail markdown={`### CopyUrl\n${OPERATION_DESCRIPTIONS.CopyUrl}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open CopyUrl" target={<CopyUrlOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="sync"
          detail={<List.Item.Detail markdown={`### Sync\n${OPERATION_DESCRIPTIONS.Sync}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open Sync" target={<SyncOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="move"
          detail={<List.Item.Detail markdown={`### Move\n${OPERATION_DESCRIPTIONS.Move}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open Move" target={<MoveOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="movefile"
          detail={<List.Item.Detail markdown={`### MoveFile\n${OPERATION_DESCRIPTIONS.MoveFile}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open MoveFile" target={<MoveFileOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="delete"
          detail={<List.Item.Detail markdown={`### Delete\n${OPERATION_DESCRIPTIONS.Delete}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open Delete" target={<DeleteOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="deletefile"
          detail={<List.Item.Detail markdown={`### DeleteFile\n${OPERATION_DESCRIPTIONS.DeleteFile}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open DeleteFile" target={<DeleteFileOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="purge"
          detail={<List.Item.Detail markdown={`### Purge\n${OPERATION_DESCRIPTIONS.Purge}`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Open Purge" target={<PurgeOperation initialRemote={remote} />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
