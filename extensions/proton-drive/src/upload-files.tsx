import { useEffect, useMemo, useState } from "react";
import { basename } from "node:path";
import {
  Action,
  ActionPanel,
  Form,
  getSelectedFinderItems,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { displayPath } from "./components/NodeActions";
import { listFolderCached, ROOT, upload } from "./lib/cli";
import { isDemo } from "./lib/demo";
import { showError } from "./lib/errors";
import { handleSignedOut, isSignedOut, useSignedOut } from "./lib/session";
import { SignedOutView } from "./components/SignedOutView";
import { readIndex } from "./lib/index";
import { sortNodes } from "./lib/sort";

export default function Command() {
  const [files, setFiles] = useState<string[]>();
  const [indexedFolders, setIndexedFolders] = useState<string[]>([]);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => setFiles(items.map((i) => i.path)))
      .catch(() => setFiles([]));
    // Optional: with the search index, typing can jump to any folder of the Drive.
    readIndex().then((index) => setIndexedFolders(index?.folders.slice(1) ?? []));
  }, []);

  // Until the Finder selection is known, show nothing: rendering the folder picker first and then
  // switching to the file form made the wrong screen flash.
  if (!files) return <List isLoading />;
  // Nothing selected in Finder: let the user pick files or folders here instead.
  if (files.length === 0) return <ChooseFiles indexedFolders={indexedFolders} />;

  return <FolderPicker path={ROOT} files={files} indexedFolders={indexedFolders} />;
}

function ChooseFiles(props: { indexedFolders: string[] }) {
  const { push } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle="Upload Files"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Choose Destination"
            icon={Icon.ArrowRight}
            onSubmit={({ files }: { files: string[] }) => {
              if (!files?.length) return setError("Choose at least one file or folder");
              push(<FolderPicker path={ROOT} files={files} indexedFolders={props.indexedFolders} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Nothing is selected in Finder. Choose what to upload, then pick a Drive folder." />
      <Form.FilePicker
        id="files"
        title="Files or Folders"
        allowMultipleSelection
        canChooseDirectories
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

/**
 * Destination picker: browse the Drive folder by folder (no index needed) and upload to the
 * current folder or to any subfolder. With the search index, typing also matches folders anywhere.
 */
function FolderPicker(props: { path: string; files: string[]; indexedFolders: string[] }) {
  const { path, files, indexedFolders } = props;
  const [query, setQuery] = useState("");
  const signedOut = useSignedOut();
  const { data, isLoading } = useCachedPromise(listFolderCached, [path, isDemo() ? "demo" : "live"], {
    onError: async (error) => {
      if (isSignedOut(error)) {
        await handleSignedOut();
      } else {
        await showError(error, "Could not list folder");
      }
    },
  });

  const label = files.length === 1 ? basename(files[0]) : `${files.length} items`;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (p: string) => words.every((w) => p.toLowerCase().includes(w));

  const subfolders = useMemo(
    () => sortNodes(data ?? [], "name").filter((n) => n.type === "folder" && matches(n.name)),
    [data, query],
  );
  // Direct subfolders are already listed above; compare real paths (names may contain an escaped "/").
  const subfolderPaths = useMemo(() => new Set((data ?? []).map((n) => n.path)), [data]);
  const elsewhere = useMemo(
    () =>
      words.length ? indexedFolders.filter((p) => matches(p) && p !== path && !subfolderPaths.has(p)).slice(0, 50) : [],
    [indexedFolders, query, path, subfolderPaths],
  );

  const uploadHere = (target: string) => (
    <Action title={`Upload to ${displayPath(target)}`} icon={Icon.Upload} onAction={() => doUpload(files, target)} />
  );
  const open = (target: string) => (
    <Action.Push
      title="Open Folder"
      icon={Icon.Folder}
      target={<FolderPicker path={target} files={files} indexedFolders={indexedFolders} />}
    />
  );

  if (signedOut) return <SignedOutView />;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      navigationTitle={`Upload ${label}`}
      searchBarPlaceholder={`Choose a folder in ${displayPath(path)}…`}
    >
      <List.Section title={`Upload ${label}`}>
        <List.Item
          title={`Upload to ${displayPath(path)}`}
          subtitle="This folder"
          icon={Icon.Upload}
          actions={<ActionPanel>{uploadHere(path)}</ActionPanel>}
        />
      </List.Section>
      <List.Section title="Subfolders" subtitle="↵ to open · ⌘↵ to upload there">
        {subfolders.map((folder) => (
          <List.Item
            key={folder.uid}
            title={folder.name}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                {open(folder.path)}
                {/* Second action: ⌘↵ in Raycast. */}
                {uploadHere(folder.path)}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {elsewhere.length > 0 && (
        <List.Section title="Other Folders" subtitle="from the search index">
          {elsewhere.map((p) => (
            <List.Item
              key={p}
              title={displayPath(p)}
              icon={Icon.Folder}
              actions={
                <ActionPanel>
                  {/* Same keys as Subfolders: ↵ opens, ⌘↵ uploads. */}
                  {open(p)}
                  {uploadHere(p)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

async function doUpload(files: string[], parentPath: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Uploading ${files.length} item(s)…` });
  try {
    const result = await upload(files, parentPath);
    toast.style = result.failedItems ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = result.failedItems
      ? `${result.failedItems} item(s) failed`
      : `Uploaded to ${displayPath(parentPath)}`;
    toast.message = `${result.transferredItems} uploaded · ${result.skippedItems} unchanged`;
    if (!result.failedItems) await popToRoot();
  } catch (error) {
    await toast.hide();
    if (isSignedOut(error)) await handleSignedOut();
    else await showError(error, "Upload failed");
  }
}
