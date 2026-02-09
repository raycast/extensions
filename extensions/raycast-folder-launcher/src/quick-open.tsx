import {
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  LocalStorage,
  Icon,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import Fuse from "fuse.js";

const execAsync = promisify(exec);

interface Preferences {
  workspacePath: string;
  appChoice: string;
  customAppPath?: string;
  maxDepth: string;
}

interface Arguments {
  query?: string;
}

interface AppConfig {
  name: string;
  path: string;
  useOpen: boolean;
}

const APP_CONFIGS: Record<string, AppConfig> = {
  antigravity: {
    name: "Antigravity",
    path: "/Users/cuipengcheng/.antigravity/antigravity/bin/antigravity",
    useOpen: false,
  },
  vscode: {
    name: "VS Code",
    path: "code",
    useOpen: false,
  },
  cursor: {
    name: "Cursor",
    path: "cursor",
    useOpen: false,
  },
  zed: {
    name: "Zed",
    path: "zed",
    useOpen: false,
  },
  webstorm: {
    name: "WebStorm",
    path: "webstorm",
    useOpen: false,
  },
  idea: {
    name: "IntelliJ IDEA",
    path: "idea",
    useOpen: false,
  },
  sublime: {
    name: "Sublime Text",
    path: "subl",
    useOpen: false,
  },
  opencode: {
    name: "OpenCode",
    path: "OpenCode",
    useOpen: true,
  },
};

interface DirectoryItem {
  name: string;
  path: string;
  frecency: number;
  lastAccessed: number;
}

interface StoredData {
  directories: DirectoryItem[];
}

const STORAGE_KEY = "folder-launcher-directories";
const ONE_HOUR_MS = 1000 * 60 * 60;
const ONE_DAY_HOURS = 24;
const ONE_WEEK_HOURS = 168;

async function scanDirectoriesRecursively(
  basePath: string,
  maxDepth: number,
): Promise<string[]> {
  const directories: string[] = [];

  async function scan(dirPath: string, currentDepth: number) {
    if (currentDepth > maxDepth) return;

    try {
      const entries = await fs.promises.readdir(dirPath, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const fullPath = path.join(dirPath, entry.name);
          directories.push(fullPath);
          if (currentDepth < maxDepth) {
            await scan(fullPath, currentDepth + 1);
          }
        }
      }
    } catch {
      /* permission denied - skip */
    }
  }

  await scan(basePath, 1);
  return directories;
}

function calculateFrecencyScore(item: DirectoryItem): number {
  const hoursSinceAccess = (Date.now() - item.lastAccessed) / ONE_HOUR_MS;

  let timeDecayWeight = 1;
  if (hoursSinceAccess < 1) {
    timeDecayWeight = 4;
  } else if (hoursSinceAccess < ONE_DAY_HOURS) {
    timeDecayWeight = 2;
  } else if (hoursSinceAccess < ONE_WEEK_HOURS) {
    timeDecayWeight = 1.5;
  }

  return item.frecency * timeDecayWeight;
}

async function loadStoredDirectories(): Promise<DirectoryItem[]> {
  const storedData = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!storedData) return [];

  const parsed: StoredData = JSON.parse(storedData);
  return parsed.directories || [];
}

function mergeDirectories(
  existingDirs: DirectoryItem[],
  scannedPaths: string[],
): DirectoryItem[] {
  const dirMap = new Map<string, DirectoryItem>();

  for (const dir of existingDirs) {
    if (fs.existsSync(dir.path)) {
      dirMap.set(dir.path, dir);
    }
  }

  for (const dirPath of scannedPaths) {
    if (!dirMap.has(dirPath)) {
      dirMap.set(dirPath, {
        name: path.basename(dirPath),
        path: dirPath,
        frecency: 1,
        lastAccessed: 0,
      });
    }
  }

  return Array.from(dirMap.values());
}

async function persistDirectories(directories: DirectoryItem[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ directories }));
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const initialQuery = props.arguments.query || "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeDirectories() {
      setIsLoading(true);
      try {
        const existingDirs = await loadStoredDirectories();
        const maxDepth = parseInt(preferences.maxDepth) || 2;
        const scannedPaths = await scanDirectoriesRecursively(
          preferences.workspacePath,
          maxDepth,
        );
        const allDirs = mergeDirectories(existingDirs, scannedPaths);

        setDirectories(allDirs);
        await persistDirectories(allDirs);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load directories",
          message: String(error),
        });
      }
      setIsLoading(false);
    }

    initializeDirectories();
  }, []);

  const fuseSearcher = useMemo(() => {
    return new Fuse(directories, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "path", weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [directories]);

  const filteredDirectories = useMemo(() => {
    const sortByFrecency = (items: DirectoryItem[]) =>
      [...items].sort(
        (a, b) => calculateFrecencyScore(b) - calculateFrecencyScore(a),
      );

    if (!searchText) {
      return sortByFrecency(directories);
    }

    const searchResults = fuseSearcher.search(searchText).map((r) => r.item);
    return sortByFrecency(searchResults).slice(0, 20);
  }, [searchText, directories, fuseSearcher]);

  async function openInApp(item: DirectoryItem) {
    const appChoice = preferences.appChoice;
    let appConfig: AppConfig;

    if (appChoice === "custom") {
      const customPath = preferences.customAppPath || "";
      appConfig = {
        name: "Custom App",
        path: customPath,
        useOpen: customPath.endsWith(".app"),
      };
    } else {
      appConfig = APP_CONFIGS[appChoice] || APP_CONFIGS.antigravity;
    }

    try {
      if (appConfig.useOpen) {
        await execAsync(`open -a "${appConfig.path}" "${item.path}"`);
      } else {
        await execAsync(`"${appConfig.path}" "${item.path}"`);
      }

      const updatedDirs = directories.map((d) =>
        d.path === item.path
          ? { ...d, frecency: d.frecency + 1, lastAccessed: Date.now() }
          : d,
      );

      setDirectories(updatedDirs);
      await persistDirectories(updatedDirs);

      showToast({
        style: Toast.Style.Success,
        title: `Opened in ${appConfig.name}`,
        message: item.name,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open",
        message: String(error),
      });
    }
  }

  const currentApp =
    preferences.appChoice === "custom"
      ? "Custom App"
      : APP_CONFIGS[preferences.appChoice]?.name || "App";

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search directories (like zoxide)..."
    >
      {filteredDirectories.map((item) => (
        <List.Item
          key={item.path}
          icon={Icon.Folder}
          title={item.name}
          subtitle={item.path.replace(preferences.workspacePath, "~")}
          accessories={[
            {
              text: item.frecency > 1 ? `×${item.frecency}` : undefined,
              icon: Icon.Star,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={`Open in ${currentApp}`}
                icon={Icon.Terminal}
                onAction={() => openInApp(item)}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={item.path}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.ShowInFinder
                path={item.path}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
