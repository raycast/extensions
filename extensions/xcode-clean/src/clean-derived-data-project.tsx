import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";
import { confirmIfNeeded } from "./lib/confirm";
import { formatError } from "./lib/error";
import { CacheEntry, formatBytes, getSize, rmrf } from "./lib/cache";
import CleanInfo from "./components/CleanInfo";

const DERIVED_DATA_ROOT = join(
  homedir(),
  "Library/Developer/Xcode/DerivedData",
);

type Entry = {
  /** Folder name as on disk, e.g. "MyApp-abcdef123456" */
  folder: string;
  /** Display name with the trailing hash stripped, e.g. "MyApp" */
  displayName: string;
  /** Absolute path */
  path: string;
  /** Size in bytes, null while still being measured */
  size: number | null;
};

const SKIP = new Set(["ModuleCache.noindex"]);

function stripHash(folder: string): string {
  // DerivedData folders look like "ProjectName-abcdef123456".
  // The hash segment is base32 letters+digits, ~28 chars. Strip after the LAST dash
  // only if what follows looks like a hash.
  const i = folder.lastIndexOf("-");
  if (i <= 0) return folder;
  const tail = folder.slice(i + 1);
  if (/^[a-z0-9]{20,}$/i.test(tail)) return folder.slice(0, i);
  return folder;
}

async function listFolders(): Promise<Entry[]> {
  let raw: import("fs").Dirent[];
  try {
    raw = await fs.readdir(DERIVED_DATA_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }
  return raw
    .filter(
      (e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith("."),
    )
    .map((e) => ({
      folder: e.name,
      displayName: stripHash(e.name),
      path: join(DERIVED_DATA_ROOT, e.name),
      size: null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export default function Command() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    // Show the folder list right away; sizes stream in as du finishes.
    const base = await listFolders();
    setEntries(base);
    const sized = await Promise.all(
      base.map(async (e) => {
        const size = await getSize(e.path);
        setEntries((prev) =>
          prev.map((x) => (x.folder === e.folder ? { ...x, size } : x)),
        );
        return { ...e, size };
      }),
    );
    sized.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    setEntries(sized);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function clean(entry: Entry) {
    const sizeLabel =
      entry.size === null ? "" : ` (${formatBytes(entry.size)})`;
    const ok = await confirmIfNeeded(
      `Delete ${entry.displayName}${sizeLabel} from Derived Data?`,
    );
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Cleaning ${entry.displayName}…`,
    });
    try {
      await rmrf(entry.path);
      toast.style = Toast.Style.Success;
      toast.title =
        entry.size === null
          ? `Cleaned ${entry.displayName}`
          : `Cleaned ${formatBytes(entry.size)}`;
      await refresh();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = formatError(e);
    }
  }

  const total = entries.reduce((s, e) => s + (e.size ?? 0), 0);

  return (
    <List
      isLoading={loading}
      navigationTitle={`Derived Data (${formatBytes(total)})`}
      searchBarPlaceholder="Search project…"
    >
      {entries.length === 0 && !loading && (
        <List.EmptyView icon={Icon.CheckCircle} title="Derived Data is empty" />
      )}
      {entries.map((e) => {
        const entry: CacheEntry = {
          id: `dd-${e.folder}`,
          name: e.displayName,
          description: e.folder,
          info: `Deletes **only this project's Derived Data folder** at \`~/Library/Developer/Xcode/DerivedData/${e.folder}\`. Other projects' caches are kept untouched.\n\nXcode will rebuild this project from scratch on the next build.`,
          category: "Xcode",
          paths: [e.path],
        };
        return (
          <List.Item
            key={e.folder}
            icon={{ source: Icon.HardDrive, tintColor: Color.Orange }}
            title={e.displayName}
            subtitle={e.folder}
            accessories={[
              { text: e.size === null ? "…" : formatBytes(e.size) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Info"
                  icon={Icon.Info}
                  target={
                    <CleanInfo
                      title={e.displayName}
                      description={entry.info}
                      caches={[entry]}
                    />
                  }
                />
                <Action
                  title="Clean This Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => clean(e)}
                />
                <Action.ShowInFinder path={e.path} />
                <Action
                  title="Refresh Sizes"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
