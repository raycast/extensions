import { Action, ActionPanel, Icon, LaunchProps, List, showHUD } from "@raycast/api";
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

function FileActions(props: { file: AirDroppedFile; transfer: AirDroppedFile[]; intent?: "copy" | "paste" }) {
  const { file, transfer, intent } = props;
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
    </ActionPanel>
  );
}

function FileListItem(props: { file: AirDroppedFile; transfer: AirDroppedFile[]; intent?: "copy" | "paste" }) {
  const { file, transfer, intent } = props;
  return (
    <List.Item
      icon={{ fileIcon: file.path }}
      title={file.name}
      accessories={[{ date: file.receivedAt, tooltip: `Received ${file.receivedAt.toLocaleString()}` }]}
      actions={<FileActions file={file} transfer={transfer} intent={intent} />}
    />
  );
}

export default function Command(props: LaunchProps<{ launchContext: SearchLaunchContext }>) {
  const scope = props.launchContext?.scope;
  const intent = props.launchContext?.intent;

  const { isLoading, data } = usePromise(findAirDroppedFiles, [], {
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
      <List.Section title="Latest Transfer" subtitle={describeTransfer(visibleTransfer)}>
        {visibleTransfer.map((file) => (
          <FileListItem key={file.path} file={file} transfer={transfer} intent={intent} />
        ))}
      </List.Section>
      {earlier.length > 0 && (
        <List.Section title="Earlier">
          {earlier.map((file) => (
            <FileListItem key={file.path} file={file} transfer={transfer} intent={intent} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
