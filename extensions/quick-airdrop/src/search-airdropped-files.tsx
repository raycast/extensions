import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  AirDroppedFile,
  copyFilesToClipboard,
  describeTransfer,
  findAirDroppedFiles,
  latestTransfer,
} from "./lib/airdropped";
import { pasteAirDroppedFiles } from "./lib/paste";

type SearchLaunchContext = {
  scope?: "latest-transfer";
  intent?: "copy" | "paste";
};

async function copyFiles(files: AirDroppedFile[]) {
  try {
    await copyFilesToClipboard(files.map((file) => file.path));
    await showHUD(`Copied ${describeTransfer(files)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not copy" });
  }
}

async function pasteFiles(files: AirDroppedFile[]) {
  try {
    await pasteAirDroppedFiles(files);
  } catch (error) {
    await showFailureToast(error, { title: "Could not paste" });
  }
}

async function trashFiles(files: AirDroppedFile[], onTrashed: () => void) {
  const confirmed = await confirmAlert({
    title: files.length === 1 ? "Move File to Trash?" : `Move ${files.length} Files to Trash?`,
    message: describeTransfer(files),
    icon: Icon.Trash,
    primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }
  try {
    await trash(files.map((file) => file.path));
    await showToast({ style: Toast.Style.Success, title: `Moved ${describeTransfer(files)} to Trash` });
    onTrashed();
  } catch (error) {
    await showFailureToast(error, { title: "Could not move to Trash" });
  }
}

function FileActions(props: {
  file: AirDroppedFile;
  transfer: AirDroppedFile[];
  intent?: "copy" | "paste";
  onTrashed: () => void;
}) {
  const { file, transfer, intent, onTrashed } = props;
  const isPasteFirst = intent === "paste";

  const copySingle = <Action icon={Icon.Clipboard} title="Copy File" onAction={() => copyFiles([file])} />;
  const pasteSingle = <Action icon={Icon.Document} title="Paste File" onAction={() => pasteFiles([file])} />;
  const transferActions =
    transfer.length > 1 && transfer.some((item) => item.path === file.path) ? (
      <ActionPanel.Section title="Latest Transfer">
        <Action
          icon={Icon.CopyClipboard}
          title={`Copy All ${transfer.length} Files`}
          onAction={() => copyFiles(transfer)}
        />
        <Action
          icon={Icon.Document}
          title={`Paste All ${transfer.length} Files`}
          onAction={() => pasteFiles(transfer)}
        />
      </ActionPanel.Section>
    ) : null;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isPasteFirst ? pasteSingle : copySingle}
        {isPasteFirst ? copySingle : pasteSingle}
      </ActionPanel.Section>
      {transferActions}
      <ActionPanel.Section>
        <Action.Open target={file.path} title="Open File" />
        <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
        <Action.OpenWith path={file.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Trash
          paths={file.path}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onTrash={async () => {
            await showToast({ style: Toast.Style.Success, title: `Moved ${file.name} to Trash` });
            onTrashed();
          }}
        />
        {transfer.length > 1 && transfer.some((item) => item.path === file.path) && (
          <Action
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            title={`Trash All ${transfer.length} Files`}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={() => trashFiles(transfer, onTrashed)}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function FileListItem(props: {
  file: AirDroppedFile;
  transfer: AirDroppedFile[];
  intent?: "copy" | "paste";
  onTrashed: () => void;
}) {
  const { file, transfer, intent, onTrashed } = props;
  return (
    <List.Item
      icon={{ fileIcon: file.path }}
      title={file.name}
      accessories={[{ date: file.receivedAt, tooltip: `Received ${file.receivedAt.toLocaleString()}` }]}
      actions={<FileActions file={file} transfer={transfer} intent={intent} onTrashed={onTrashed} />}
    />
  );
}

export default function Command(props: LaunchProps<{ launchContext: SearchLaunchContext }>) {
  const scope = props.launchContext?.scope;
  const intent = props.launchContext?.intent;

  const { isLoading, data, revalidate } = usePromise(findAirDroppedFiles, [], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Could not scan the Downloads folder" });
    },
  });

  const files = data ?? [];
  const transfer = latestTransfer(files);
  const scopedToTransfer = scope === "latest-transfer";
  const earlier = scopedToTransfer ? [] : files.slice(transfer.length);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={scopedToTransfer ? "Filter files of the last transfer…" : "Search AirDropped files…"}
      navigationTitle={scopedToTransfer ? "Last AirDrop Transfer" : undefined}
    >
      <List.EmptyView
        icon={Icon.Wifi}
        title="No AirDropped Files"
        description="Files received via AirDrop land in your Downloads folder — nothing there right now."
      />
      <List.Section title="Latest Transfer" subtitle={describeTransfer(transfer)}>
        {transfer.map((file) => (
          <FileListItem key={file.path} file={file} transfer={transfer} intent={intent} onTrashed={revalidate} />
        ))}
      </List.Section>
      {earlier.length > 0 && (
        <List.Section title="Earlier">
          {earlier.map((file) => (
            <FileListItem key={file.path} file={file} transfer={transfer} intent={intent} onTrashed={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
