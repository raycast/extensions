import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { IPlatformAdapter } from "./types";

const execFileAsync = promisify(execFile);

export class WindowsPlatformAdapter implements IPlatformAdapter {
  public readonly platformName = "Windows" as const;

  public normalizePath(filePath: string): string {
    if (!filePath) return "";
    let normalized = path.win32.normalize(filePath);
    // Standardize drive letters (e.g. c:\ -> C:\)
    if (/^[a-zA-Z]:\\/.test(normalized)) {
      normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    return normalized;
  }

  public isCaseInsensitive(): boolean {
    return true; // Windows NTFS / ReFS is case-preserving but case-insensitive
  }

  public async getRecentProjectPaths(limit = 60): Promise<string[]> {
    const found = new Set<string>();
    const ordered: string[] = [];

    const addPath = (raw: string) => {
      if (!raw || typeof raw !== "string") return;
      const clean = this.normalizePath(raw.trim());
      const ext = path.extname(clean).replace(".", "").toLowerCase();
      if (ext !== "prproj" && ext !== "aep") return;

      const lowerKey = clean.toLowerCase();
      if (!found.has(lowerKey) && fs.existsSync(clean)) {
        found.add(lowerKey);
        ordered.push(clean);
      }
    };

    // 1. Check Premiere Pro Prefs in User Documents
    try {
      const prefsPaths = await this.readPremierePrefsRecents();
      for (const p of prefsPaths) addPath(p);
    } catch {
      // Non-blocking
    }

    // 2. Check Windows Recent items folder
    try {
      const recentLnkPaths = await this.readWindowsRecentFolder();
      for (const p of recentLnkPaths) addPath(p);
    } catch {
      // Non-blocking
    }

    return ordered.slice(0, limit);
  }

  public async searchProjectPaths(
    searchTerm = "",
    scope: "home" | "all" | string = "home",
    limit = 100,
  ): Promise<string[]> {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const searchRoot =
      scope === "home" || scope === "system" ? userProfile : scope === "all" || scope === "global" ? "C:\\" : scope;
    const cleanTerm = searchTerm.trim().replace(/['"\r\n]/g, "");

    // Use PowerShell Get-ChildItem with bounded depth and filter
    const script =
      cleanTerm.length > 0
        ? `Get-ChildItem -Path '${searchRoot}' -Include '*.prproj','*.aep' -Recurse -Depth 6 -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${cleanTerm}*' } | Select-Object -ExpandProperty FullName -First ${limit}`
        : `Get-ChildItem -Path '${searchRoot}' -Include '*.prproj','*.aep' -Recurse -Depth 6 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First ${limit}`;

    try {
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
        timeout: 8000,
        maxBuffer: 4 * 1024 * 1024,
      });

      return stdout
        .split("\r\n")
        .concat(stdout.split("\n"))
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && fs.existsSync(p))
        .map((p) => this.normalizePath(p))
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  public getMediaCacheDirectories(): string[] {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData/Roaming");
    const commonDir = path.join(appData, "Adobe/Common");

    return [
      path.join(commonDir, "Media Cache Files"),
      path.join(commonDir, "Media Cache"),
      path.join(commonDir, "Peak Files"),
    ].filter((dir) => fs.existsSync(dir));
  }

  public async openInPremiere(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const appPath = await this.getAppInstallationPath();
    if (appPath) {
      await execFileAsync(appPath, [filePath], { timeout: 5000 });
    } else {
      // Use explorer / start
      await execFileAsync("cmd.exe", ["/c", "start", "", filePath], { timeout: 5000 });
    }
  }

  public async revealInFileManager(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    await execFileAsync("explorer.exe", [`/select,${path.win32.normalize(filePath)}`], { timeout: 5000 });
  }

  public async getAppInstallationPath(): Promise<string | null> {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const adobeDir = path.join(programFiles, "Adobe");

    try {
      if (!fs.existsSync(adobeDir)) return null;
      const entries = await fs.promises.readdir(adobeDir);
      const premiereFolders = entries
        .filter((e) => e.startsWith("Adobe Premiere Pro"))
        .sort()
        .reverse();

      for (const folder of premiereFolders) {
        const exePath = path.join(adobeDir, folder, "Adobe Premiere Pro.exe");
        if (fs.existsSync(exePath)) {
          return exePath;
        }
      }
    } catch {
      // Non-blocking
    }

    return null;
  }

  public async readPremierePrefsRecents(): Promise<string[]> {
    const results: string[] = [];
    const userProfile = process.env.USERPROFILE || os.homedir();
    const premiereDocsDir = path.join(userProfile, "Documents/Adobe/Premiere Pro");
    if (!fs.existsSync(premiereDocsDir)) return results;

    try {
      const versionDirs = await fs.promises.readdir(premiereDocsDir);
      for (const vDir of versionDirs) {
        const fullVDir = path.join(premiereDocsDir, vDir);
        const vStat = await fs.promises.stat(fullVDir).catch(() => null);
        if (!vStat || !vStat.isDirectory()) continue;

        const subEntries = await fs.promises.readdir(fullVDir);
        const profileDirs = subEntries.filter((s) => s.startsWith("Profile-"));
        const candidateDirs = profileDirs.length > 0 ? profileDirs.map((p) => path.join(fullVDir, p)) : [fullVDir];

        for (const targetDir of candidateDirs) {
          const prefsFile = path.join(targetDir, "Adobe Premiere Pro Prefs");
          if (fs.existsSync(prefsFile)) {
            const content = await fs.promises.readFile(prefsFile, "utf8");
            const mruRegex = /<BE\.Prefs\.MRU\.Document\.\d+>([^<]+)<\/BE\.Prefs\.MRU\.Document\.\d+>/gi;
            let match: RegExpExecArray | null;
            while ((match = mruRegex.exec(content)) !== null) {
              const p = match[1].trim();
              if (p && fs.existsSync(p)) {
                results.push(this.normalizePath(p));
              }
            }
          }
        }
      }
    } catch {
      // Non-blocking
    }

    return results;
  }

  public async readWindowsRecentFolder(): Promise<string[]> {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData/Roaming");
    const recentDir = path.join(appData, "Microsoft/Windows/Recent");
    if (!fs.existsSync(recentDir)) return [];

    try {
      const entries = await fs.promises.readdir(recentDir);
      const prprojShortcuts = entries.filter((e) => e.toLowerCase().includes(".prproj"));
      const resolvedPaths: string[] = [];

      for (const shortcut of prprojShortcuts) {
        // Simple heuristic: Windows recent folder items usually name the target file as "filename.prproj.lnk"
        const candidateName = shortcut.replace(/\.lnk$/i, "");
        if (candidateName.endsWith(".prproj") && fs.existsSync(candidateName)) {
          resolvedPaths.push(this.normalizePath(candidateName));
        }
      }
      return resolvedPaths;
    } catch {
      return [];
    }
  }
}
