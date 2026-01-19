import { useState, useEffect } from "react";
import { List, Action, ActionPanel, Icon, Color, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PROJECT_TYPES = [
  {
    id: "node-js-ts",
    fileMarkers: ["package.json", "pnpm-lock.yaml", "yarn.lock", "package-lock.json", "tsconfig.json"],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["node_modules", ".next", "dist", "build", "out"],
  },
  {
    id: "java-kotlin",
    fileMarkers: [
      "pom.xml",
      "build.gradle",
      "settings.gradle",
      "build.gradle.kts",
      "settings.gradle.kts",
      "gradle.properties",
    ],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["target", "build", ".gradle"],
  },
  {
    id: "python",
    fileMarkers: ["requirements.txt", "pyproject.toml", "Pipfile"],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["venv", "env", "__pycache__", ".tox", ".mypy_cache", ".pytest_cache"],
  },
  {
    id: "go",
    fileMarkers: ["go.mod"],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["bin", "dist"],
  },
  {
    id: "rust",
    fileMarkers: ["Cargo.toml"],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["target"],
  },
  {
    id: "php",
    fileMarkers: ["composer.json"],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["vendor"],
  },
  {
    id: "swift-objc",
    fileMarkers: ["Package.swift"],
    dirMarkers: [".xcodeproj", ".xcworkspace"],
    fileSuffixes: [],
    cleanDirs: ["DerivedData", "build"],
  },
  {
    id: "haskell",
    fileMarkers: ["stack.yaml", "cabal.project"],
    dirMarkers: [],
    fileSuffixes: [".cabal"],
    cleanDirs: ["dist-newstyle", ".stack-work", "dist", "build"],
  },
  {
    id: "generic",
    fileMarkers: ["Makefile"],
    dirMarkers: [],
    fileSuffixes: [],
    cleanDirs: ["build", "dist", "out"],
  },
];

const SCAN_ROOTS = [
  path.join(os.homedir(), "Projects"),
  path.join(os.homedir(), "project"),
  path.join(os.homedir(), "workspace"),
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
];

const MAX_SCAN_DEPTH = 8;

interface CleanableItem {
  projectName: string;
  projectPath: string;
  projectTypes: string[];
  cleanDirs: { name: string; absPath: string; size: number }[];
}

function bytesToHuman(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function dirExists(p: string) {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function getDirSize(p: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("du", ["-sk", p]);
    const kb = parseInt(stdout.split("\t")[0], 10);
    return kb * 1024;
  } catch {
    return 0;
  }
}

async function findProjects(root: string, maxDepth = MAX_SCAN_DEPTH): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: Awaited<ReturnType<typeof fs.readdir>> = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
    const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const hasMarker = PROJECT_TYPES.some((t) => {
      const fileHit = t.fileMarkers.some((m) => fileNames.includes(m));
      const dirHit = t.dirMarkers.some((m) => dirNames.some((d) => d.endsWith(m)));
      const suffixHit = t.fileSuffixes.some((suf) => fileNames.some((n) => n.endsWith(suf)));
      return fileHit || dirHit || suffixHit;
    });
    if (hasMarker) {
      found.push(dir);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await walk(path.join(dir, entry.name), depth + 1);
      }
    }
  }
  await walk(root, 1);
  return found;
}

async function scanAllProjects(): Promise<CleanableItem[]> {
  const projects: string[] = [];
  for (const root of SCAN_ROOTS) {
    projects.push(...(await findProjects(root)));
  }
  const result: CleanableItem[] = [];
  for (const projectPath of projects) {
    let entries: Awaited<ReturnType<typeof fs.readdir>> = [];
    try {
      entries = await fs.readdir(projectPath, { withFileTypes: true });
    } catch {
      continue;
    }
    const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
    const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const matchedTypes = PROJECT_TYPES.filter((t) => {
      const fileHit = t.fileMarkers.some((m) => fileNames.includes(m));
      const dirHit = t.dirMarkers.some((m) => dirNames.some((d) => d.endsWith(m)));
      const suffixHit = t.fileSuffixes.some((suf) => fileNames.some((n) => n.endsWith(suf)));
      return fileHit || dirHit || suffixHit;
    }).map((t) => t.id);
    if (matchedTypes.length === 0) continue;

    const dirSet = new Set<string>();
    for (const type of PROJECT_TYPES) {
      if (matchedTypes.includes(type.id)) {
        type.cleanDirs.forEach((d) => dirSet.add(d));
      }
    }

    const cleanDirs = [];
    for (const dir of dirSet) {
      const abs = path.join(projectPath, dir);
      if (await dirExists(abs)) {
        const size = await getDirSize(abs);
        if (size > 0) {
          cleanDirs.push({ name: dir, absPath: abs, size });
        }
      }
    }
    if (cleanDirs.length > 0) {
      result.push({
        projectName: path.basename(projectPath),
        projectPath,
        projectTypes: matchedTypes,
        cleanDirs,
      });
    }
  }
  return result;
}

export default function DevCleaner() {
  const [items, setItems] = useState<CleanableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setIsLoading(true);
    const data = await scanAllProjects();
    setItems(data);
    setIsLoading(false);
    setSelected(new Set());
    if (data.length > 0) {
      await showToast({ style: Toast.Style.Success, title: `Found ${data.length} projects with cleanable dirs` });
    } else {
      await showToast({ style: Toast.Style.Success, title: `No cleanable projects found` });
    }
  }

  function toggleSelection(absPath: string) {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(absPath)) newSet.delete(absPath);
      else newSet.add(absPath);
      return newSet;
    });
  }

  async function selectAll() {
    const all = filteredItems().flatMap((item) => item.cleanDirs.map((d) => d.absPath));
    if (all.length > 0) {
      const confirmed = await confirmAlert({
        title: "Warning: Dangerous Operation",
        message:
          "You are about to select all cleanable directories for deletion. This action cannot be undone. Are you sure you want to proceed?",
        primaryAction: { title: "Select All", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    setSelected(new Set(all));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  function filteredItems() {
    return items.filter((item) =>
      searchText
        ? item.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
          item.projectPath.toLowerCase().includes(searchText.toLowerCase()) ||
          item.projectTypes.some((t) => t.toLowerCase().includes(searchText.toLowerCase()))
        : true,
    );
  }

  async function deleteSelectedDirs() {
    if (selected.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No directories selected",
        message: "Please select at least one directory to delete",
      });
      return;
    }
    const selectedList = items.flatMap((item) =>
      item.cleanDirs
        .filter((d) => selected.has(d.absPath))
        .map((d) => ({ ...d, projectName: item.projectName, projectPath: item.projectPath })),
    );
    const confirmed = await confirmAlert({
      title: `Delete ${selected.size} directory(s)?`,
      message: `This will permanently remove:\n${selectedList.map((d) => `• [${d.projectName}] ${d.name} (${bytesToHuman(d.size)})`).join("\n")}`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${selected.size} directory(s)...` });
    let deleted = 0;
    let totalSize = 0;
    for (const dir of selectedList) {
      try {
        await fs.rm(dir.absPath, { recursive: true, force: true });
        deleted++;
        totalSize += dir.size;
      } catch {
        // ignore
      }
    }
    toast.style = Toast.Style.Success;
    toast.title = `Deleted ${deleted} directory(s)`;
    toast.message = `Freed ${bytesToHuman(totalSize)}`;
    await loadItems();
  }

  const filtered = filteredItems();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects or paths..."
      navigationTitle={`Dev Cleaner${selected.size > 0 ? ` (${selected.size} selected)` : ""}`}
    >
      {filtered.map((item) => (
        <List.Section
          key={item.projectPath}
          title={`${item.projectName} [${item.projectTypes.join(", ")}]`}
          subtitle={item.projectPath}
        >
          {item.cleanDirs.map((dir) => {
            const isSelected = selected.has(dir.absPath);
            return (
              <List.Item
                key={dir.absPath}
                icon={{
                  source: isSelected ? Icon.CheckCircle : Icon.Circle,
                  tintColor: isSelected ? Color.Green : Color.SecondaryText,
                }}
                title={dir.name}
                subtitle={dir.absPath}
                accessories={[{ text: bytesToHuman(dir.size) }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={isSelected ? "Deselect" : "Select"}
                      icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggleSelection(dir.absPath)}
                    />
                    <Action
                      title={`Delete ${selected.size > 0 ? `${selected.size} Directory(s)` : "Selected"}`}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={deleteSelectedDirs}
                      shortcut={{ modifiers: ["cmd"], key: "u" }}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Select All"
                        icon={Icon.CheckCircle}
                        onAction={selectAll}
                        shortcut={{ modifiers: ["cmd"], key: "a" }}
                      />
                      <Action
                        title="Deselect All"
                        icon={Icon.Circle}
                        onAction={deselectAll}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Refresh List"
                        icon={Icon.ArrowClockwise}
                        onAction={loadItems}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
