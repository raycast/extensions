import {
  showToast,
  Toast,
  closeMainWindow,
  getSelectedFinderItems,
  getFrontmostApplication,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getCurrentFinderPath as getCurrentFinderPathFromUtils } from "./utils/apple-scripts";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
const exec = promisify(_exec);

async function getSelectedPathFinderItems(): Promise<string[]> {
  const script = `
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      return thePaths
    end tell
  `;
  const paths = await runAppleScript(script);
  return paths
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

async function getCurrentFinderPath(): Promise<string> {
  const path = await getCurrentFinderPathFromUtils();
  return (path || "").trim();
}

async function getGitBranch(projectPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await exec(`cd "${projectPath}" && git branch --show-current 2>/dev/null`);
    const branch = stdout.trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}

async function openPathWithTrae(projectPath: string) {
  const prefs = getPreferenceValues<Preferences>();
  const traeAppPath = prefs.traeApp?.path || "/Applications/Trae.app";

  await exec(`open -a "${traeAppPath}" "${projectPath}"`);

  const recent = (await LocalStorage.getItem<string>("trae_recent_projects")) || "[]";
  let parsed: { name: string; path: string; mtimeMs: number; gitBranch?: string }[] = [];
  try {
    parsed = JSON.parse(recent);
  } catch {
    parsed = [];
  }
  parsed = parsed.filter((x) => x.path !== projectPath);
  const gitBranch = await getGitBranch(projectPath);
  parsed.unshift({
    name: projectPath.split("/").pop() || projectPath,
    path: projectPath,
    mtimeMs: Date.now(),
    gitBranch,
  });
  await LocalStorage.setItem("trae_recent_projects", JSON.stringify(parsed.slice(0, 100)));
}

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening with Trae…" });
  try {
    let selectedItems: { path: string }[] = [];
    const currentApp = await getFrontmostApplication();

    if (currentApp?.name === "Finder") {
      selectedItems = await getSelectedFinderItems();
    } else if (currentApp?.name === "Path Finder") {
      const paths = await getSelectedPathFinderItems();
      selectedItems = paths.map((p) => ({ path: p }));
    }

    if (selectedItems.length === 0) {
      const currentPath = await getCurrentFinderPath();
      if (!currentPath) {
        throw new Error("Not a valid directory");
      }
      try {
        const st = await fs.stat(currentPath);
        if (!st.isDirectory()) {
          throw new Error("Select a folder in Finder or Path Finder");
        }
      } catch {
        throw new Error("Select a folder in Finder or Path Finder");
      }
      await openPathWithTrae(currentPath);
      toast.style = Toast.Style.Success;
      toast.title = "Opened in Trae";
      toast.message = currentPath;
    } else {
      for (const item of selectedItems) {
        await openPathWithTrae(item.path);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Opened in Trae";
      toast.message = `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`;
    }
    await closeMainWindow();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to open in Trae";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
