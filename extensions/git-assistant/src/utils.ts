import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";
import child_process from "child_process";
import { showFailureToast } from "@raycast/utils";

const execAsync = promisify(child_process.exec);
const FAVORITES_KEY = "repo-favorites";

export interface Preferences {
  scanDirectories: string;
  maxDepth?: number;
}

export interface Repo {
  name: string;
  fullPath: string;
}

export default class RepoService {
  static getPreferences(): Preferences {
    return getPreferenceValues<Preferences>();
  }

  static async getScanDirectories(): Promise<string[]> {
    const prefs = RepoService.getPreferences();
    let dirs: string[] = [];
    const scanDirsPref = prefs.scanDirectories;
    if (typeof scanDirsPref === "string" && scanDirsPref.trim()) {
      dirs = scanDirsPref
        .split(":")
        .map((d) => d.trim())
        .filter(Boolean);
    }
    return dirs;
  }

  static async listAll(): Promise<Repo[]> {
    const dirs = await RepoService.getScanDirectories();
    const normalizedDirs = dirs.map((d: string) => (d.startsWith("~") ? path.join(homedir(), d.slice(1)) : d));

    if (!normalizedDirs.length) {
      showToast(Toast.Style.Failure, "No scan directories defined");
      return [];
    }
    const prefs = RepoService.getPreferences();
    const depth = prefs.maxDepth ?? 3;
    const repos: Repo[] = [];
    for (const root of normalizedDirs) {
      try {
        const findCmd = `find -L "${root.replace(/(\s+)/g, "\\$1")}" -maxdepth ${depth} -type d -name .git || true`;
        const { stdout } = await execAsync(findCmd);
        const lines = stdout.split("\n").filter(Boolean);
        for (const gitDir of lines) {
          const repoPath = path.dirname(gitDir);
          repos.push({ name: path.basename(repoPath), fullPath: repoPath });
        }
      } catch (e: unknown) {
        showFailureToast(e, { title: "Scan error" });
      }
    }
    repos.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return repos;
  }

  static async getFavorites(): Promise<string[]> {
    const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
    if (!stored) {
      return [];
    }
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  }

  static async toggleFavorite(repoPath: string): Promise<void> {
    const favs = await RepoService.getFavorites();
    const idx = favs.indexOf(repoPath);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(repoPath);
    }
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }
}

export function abbreviateHome(p: string): string {
  return p.startsWith(homedir()) ? `~${p.slice(homedir().length)}` : p;
}
