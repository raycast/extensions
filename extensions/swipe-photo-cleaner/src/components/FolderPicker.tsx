import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { cleanupThumbnailDir, scanFolder } from "../lib/images";
import { cleanupStagingDir } from "../lib/trash";
import { ReviewSession } from "./ReviewSession";

const RECENT_DIRS_KEY = "recentDirectories";
const MAX_RECENT = 5;

async function getRecentDirs(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_DIRS_KEY);
  return stored ? JSON.parse(stored) : [];
}

async function addRecentDir(dir: string) {
  const recent = await getRecentDirs();
  const updated = [dir, ...recent.filter((d) => d !== dir)].slice(
    0,
    MAX_RECENT,
  );
  await LocalStorage.setItem(RECENT_DIRS_KEY, JSON.stringify(updated));
}

export function FolderPicker() {
  const { push } = useNavigation();
  const [recentDirs, setRecentDirs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { defaultDirectory } = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function init() {
      const [stagingCount, thumbnailCount] = await Promise.all([
        cleanupStagingDir(),
        cleanupThumbnailDir(),
      ]);
      const count = stagingCount + thumbnailCount;
      if (count > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Cleaned up ${count} file(s) from previous session`,
          message: "Files were moved to Trash",
        });
      }

      if (defaultDirectory) {
        await openFolder(defaultDirectory);
      }

      const dirs = await getRecentDirs();
      setRecentDirs(dirs);
      setIsLoading(false);
    }
    init();
  }, []);

  async function openFolder(folderPath: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Scanning folder...",
      });
      const photos = await scanFolder(folderPath);
      await addRecentDir(folderPath);

      if (photos.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No images found",
          message: folderPath,
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Found ${photos.length} photos`,
      });
      push(<ReviewSession photos={photos} />);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan folder",
        message: String(err),
      });
    }
  }

  const allDirs: { path: string; isDefault: boolean }[] = [];
  if (defaultDirectory) {
    allDirs.push({ path: defaultDirectory, isDefault: true });
  }
  for (const dir of recentDirs) {
    if (dir !== defaultDirectory) {
      allDirs.push({ path: dir, isDefault: false });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent folders...">
      {allDirs.length > 0 ? (
        <List.Section title="Folders">
          {allDirs.map((dir) => (
            <List.Item
              key={dir.path}
              title={dir.path}
              icon={Icon.Folder}
              accessories={dir.isDefault ? [{ tag: "Default" }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Review Photos"
                    icon={Icon.Image}
                    onAction={() => openFolder(dir.path)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No Folders"
          description="Set a default photos directory to get started."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Settings"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
