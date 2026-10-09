import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  trash,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { useState } from "react";
import { formatBytes } from "./format";
import { LargeFile, largeFiles, minimumSizes, spotlightFiles } from "./large-files";
import { expandPath, folderName } from "./paths";
import { scanOrShowFailure } from "./sizewise";

/** What another command or a deeplink can pass: a folder to search instead of the preference's. */
export type LargestFilesContext = { folder?: string };

export default function Command(props: LaunchProps<{ launchContext?: LargestFilesContext }>) {
  const home = homedir();
  const folder =
    expandPath(props.launchContext?.folder ?? "") ?? (getPreferenceValues<Preferences.LargestFiles>().folder || home);
  const { push } = useNavigation();
  const [minimumBytes, setMinimumBytes] = useState<number>(minimumSizes[0]);
  const {
    data: files,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (folder: string, minimum: number) => largeFiles(await spotlightFiles(folder, minimum), minimum),
    [folder, minimumBytes],
    {
      keepPreviousData: true,
      onError: async (error) => {
        await showFailureToast(error, { title: "Couldn't search for large files" });
      },
    },
  );

  async function moveToTrash(file: LargeFile) {
    try {
      await mutate(trash(file.path), {
        optimisticUpdate: (current) => current?.filter((other) => other.path !== file.path),
      });
    } catch (error) {
      await showFailureToast(error, { title: `Couldn't move ${file.name} to the Trash` });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        folder === home ? "Search large files in your home folder" : `Search large files in ${folderName(folder)}`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Minimum Size"
          value={String(minimumBytes)}
          onChange={(value) => setMinimumBytes(Number(value))}
        >
          {minimumSizes.map((size) => (
            <List.Dropdown.Item key={size} title={`${formatBytes(size)} or larger`} value={String(size)} />
          ))}
        </List.Dropdown>
      }
    >
      {files?.map((file) => (
        <List.Item
          key={file.path}
          title={file.name}
          subtitle={folderLabel(file.path, home)}
          icon={{ fileIcon: file.path }}
          quickLook={{ path: file.path, name: file.name }}
          accessories={[{ text: formatBytes(file.bytes) }]}
          actions={
            <ActionPanel>
              <Action.ShowInFinder path={file.path} />
              <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
              <Action
                title="Scan Enclosing Folder with Sizewise"
                icon={Icon.MagnifyingGlass}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => scanOrShowFailure(dirname(file.path))}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={file.path}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              <Action
                title="Move to Trash"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() =>
                  push(<ConfirmTrash file={file} folder={folderLabel(file.path, home)} onConfirm={moveToTrash} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Document}
          title={`No Files ${formatBytes(minimumBytes)} or Larger`}
          description="Spotlight may still be indexing this folder, and it skips some folders, such as most of ~/Library. Choose a smaller minimum size, or scan the folder in Sizewise to see every file."
          actions={
            <ActionPanel>
              <Action
                title="Scan with Sizewise"
                icon={Icon.MagnifyingGlass}
                onAction={() => scanOrShowFailure(folder)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

/** The folder a file is in, with the home folder shown as `~`. */
function folderLabel(path: string, home: string): string {
  const folder = dirname(path);
  return folder === home || folder.startsWith(home + "/") ? "~" + folder.slice(home.length) : folder;
}

/**
 * Asks before moving a file to the Trash. A form, not an alert, because Raycast's alerts confirm
 * with Return, and no single key should move a file to the Trash: here only ⌘↵ or a click does,
 * and Escape goes back.
 */
function ConfirmTrash(props: { file: LargeFile; folder: string; onConfirm: (file: LargeFile) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Move to Trash"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Move to Trash"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onSubmit={async () => {
              pop();
              await props.onConfirm(props.file);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`Move ${props.file.name} to the Trash?`}
        text={`It takes up ${formatBytes(props.file.bytes)} in ${props.folder}. You can put it back from the Trash.`}
      />
    </Form>
  );
}
