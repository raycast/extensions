import { useEffect, useMemo, useState } from "react";
import { basename } from "node:path";
import { Action, ActionPanel, getSelectedFinderItems, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import { displayPath } from "./components/NodeActions";
import { ROOT, upload } from "./lib/cli";
import { showError } from "./lib/errors";
import { readIndex } from "./lib/index";

export default function Command() {
  const [files, setFiles] = useState<string[]>();
  const [folders, setFolders] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => setFiles(items.map((i) => i.path)))
      .catch(() => setFiles([]));
    readIndex().then((index) => {
      setFolders(index?.folders.slice(1) ?? []);
    });
  }, []);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const all = [ROOT, ...[...folders].sort((a, b) => a.localeCompare(b))];
    return all.filter((p) => words.every((w) => p.toLowerCase().includes(w))).slice(0, 200);
  }, [folders, query]);

  if (files && files.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Finder}
          title="No Finder selection"
          description="Select files or folders in Finder, then run this command again."
        />
      </List>
    );
  }

  const label = files?.length === 1 ? basename(files[0]) : `${files?.length ?? 0} items`;

  return (
    <List
      isLoading={!files}
      filtering={false}
      onSearchTextChange={setQuery}
      navigationTitle={`Upload ${label}`}
      searchBarPlaceholder="Choose a destination folder…"
    >
      <List.Section title={`Upload ${label} to…`}>
        {shown.map((path) => (
          <List.Item
            key={path}
            title={displayPath(path)}
            icon={path === ROOT ? Icon.HardDrive : Icon.Folder}
            actions={
              <ActionPanel>
                <Action title="Upload Here" icon={Icon.Upload} onAction={() => doUpload(files ?? [], path)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
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
    await showError(error, "Upload failed");
  }
}
