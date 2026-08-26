import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { useEffect, useMemo, useState } from "react";

interface DestinationPickerProps {
  currentRoot: string;
  onSave: (root: string) => Promise<void> | void;
  onCancel: () => void;
}

interface FolderEntry {
  name: string;
  path: string;
}

const volumesRoot = "/Volumes";

export function DestinationPicker({ currentRoot, onSave, onCancel }: DestinationPickerProps) {
  const [directory, setDirectory] = useState(currentRoot);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [searchText, setSearchText] = useState("");
  const parent = useMemo(() => parentDirectory(directory), [directory]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(undefined);

    void listFolders(directory)
      .then((entries) => {
        if (active) setFolders(entries);
      })
      .catch((error) => {
        if (!active) return;
        setFolders([]);
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [directory]);

  async function select(root: string) {
    await onSave(root);
  }

  function browse(root: string) {
    setSearchText("");
    setDirectory(root);
  }

  const navigationActions = (
    <>
      <Action title="Back to Test Setup" icon={Icon.ArrowLeft} onAction={onCancel} />
      <Action title="Browse Home Folder" icon={Icon.Folder} onAction={() => browse(homedir())} />
      <Action title="Browse Mounted Volumes" icon={Icon.HardDrive} onAction={() => browse(volumesRoot)} />
    </>
  );

  return (
    <List
      navigationTitle="Choose Disk or Folder"
      searchBarPlaceholder="Search Folders"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
    >
      <List.Section title="Current Folder" subtitle={displayPath(directory)}>
        <List.Item
          id={`select:${directory}`}
          title="Use This Folder"
          subtitle={displayPath(directory)}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          accessories={[{ tag: { value: "Select", color: Color.Green } }]}
          actions={
            <ActionPanel>
              <Action title="Use This Folder" icon={Icon.CheckCircle} onAction={() => select(directory)} />
              {navigationActions}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Locations">
        <List.Item
          id="back-to-setup"
          title="Back to Test Setup"
          subtitle="Keep the current folder"
          icon={Icon.ArrowLeft}
          actions={
            <ActionPanel>
              <Action title="Back to Test Setup" icon={Icon.ArrowLeft} onAction={onCancel} />
            </ActionPanel>
          }
        />
        {parent ? (
          <List.Item
            id={`parent:${parent}`}
            title="Parent Folder"
            subtitle={displayPath(parent)}
            icon={Icon.ArrowLeft}
            actions={
              <ActionPanel>
                <Action title="Open Parent Folder" icon={Icon.ArrowLeft} onAction={() => browse(parent)} />
                {navigationActions}
              </ActionPanel>
            }
          />
        ) : null}
        <List.Item
          id={`location:${homedir()}`}
          title="Home Folder"
          subtitle={displayPath(homedir())}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Use Home Folder" icon={Icon.CheckCircle} onAction={() => select(homedir())} />
              <Action title="Browse Home Folder" icon={Icon.Folder} onAction={() => browse(homedir())} />
              <Action title="Browse Mounted Volumes" icon={Icon.HardDrive} onAction={() => browse(volumesRoot)} />
            </ActionPanel>
          }
        />
        <List.Item
          id={`location:${volumesRoot}`}
          title="Mounted Volumes"
          subtitle={volumesRoot}
          icon={Icon.HardDrive}
          actions={
            <ActionPanel>
              <Action title="Browse Mounted Volumes" icon={Icon.HardDrive} onAction={() => browse(volumesRoot)} />
              <Action title="Browse Home Folder" icon={Icon.Folder} onAction={() => browse(homedir())} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="Folders"
        subtitle={loadError ? "This folder could not be read" : `${folders.length} available`}
      >
        {folders.map((folder) => (
          <List.Item
            key={folder.path}
            id={`folder:${folder.path}`}
            title={folder.name}
            subtitle={displayPath(folder.path)}
            icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action title={`Use ${folder.name}`} icon={Icon.CheckCircle} onAction={() => select(folder.path)} />
                <Action title="Browse Folder" icon={Icon.Folder} onAction={() => browse(folder.path)} />
                {navigationActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function listFolders(directory: string): Promise<FolderEntry[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const folders = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry): Promise<FolderEntry | undefined> => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return { name: entry.name, path: entryPath };
        if (!entry.isSymbolicLink()) return undefined;

        try {
          return (await stat(entryPath)).isDirectory() ? { name: entry.name, path: entryPath } : undefined;
        } catch {
          return undefined;
        }
      }),
  );

  return folders
    .filter((entry): entry is FolderEntry => entry !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
}

function parentDirectory(directory: string): string | undefined {
  const parent = path.dirname(directory);
  return parent === directory ? undefined : parent;
}

function displayPath(value: string): string {
  const home = homedir();
  if (value === home) return "~";
  return value.startsWith(`${home}${path.sep}`) ? `~${value.slice(home.length)}` : value;
}
