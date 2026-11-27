import { open } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
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
      if (ext !== "prproj") return;

      const lowerKey = clean.toLowerCase();
      if (!found.has(lowerKey) && fs.existsSync(clean)) {
        found.add(lowerKey);
        ordered.push(clean);
      }
    };

    const errors: unknown[] = [];

    // 1. Check Premiere Pro Prefs in User Documents
    try {
      const prefsPaths = await this.readPremierePrefsRecents();
      for (const p of prefsPaths) addPath(p);
    } catch (err) {
      errors.push(err);
    }

    // 2. Check Windows Recent items folder
    try {
      const recentLnkPaths = await this.readWindowsRecentFolder();
      for (const p of recentLnkPaths) addPath(p);
    } catch (err) {
      errors.push(err);
    }

    // If no recent files were discovered and errors occurred, throw so the UI can show a retry action
    if (ordered.length === 0 && errors.length > 0) {
      const details = errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ");
      throw new Error(`Failed to discover recent Premiere Pro projects: ${details}`);
    }

    return ordered.slice(0, limit);
  }

  public async searchProjectPaths(
    searchTerm = "",
    scope: "home" | "all" | string = "home",
    limit = 100,
    signal?: AbortSignal,
  ): Promise<string[]> {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const systemDriveLetter = (process.env.SystemDrive || "C:").charAt(0).toUpperCase();
    const systemDrive = `${systemDriveLetter}:\\`;

    let searchRoots: string[] = [];
    if (scope === "home") {
      searchRoots = [userProfile];
    } else if (scope === "system") {
      searchRoots = [systemDrive];
    } else if (scope === "all" || scope === "global") {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      for (const letter of letters) {
        const rootPath = `${letter}:\\`;
        try {
          if (fs.existsSync(rootPath)) {
            searchRoots.push(rootPath);
          }
        } catch {
          // Skip inaccessible drives
        }
      }
      if (searchRoots.length === 0) {
        searchRoots = [systemDrive];
      }
    } else {
      if (!fs.existsSync(scope)) {
        throw new Error(`Search location does not exist or is not mounted: ${scope}`);
      }
      searchRoots = [scope];
    }

    const cleanTerm = searchTerm.trim().replace(/['"\r\n`$]/g, "");
    const escapedRoots = searchRoots.map((r) => `'${r.replace(/'/g, "''")}'`).join(", ");

    // Use PowerShell Get-ChildItem with -LiteralPath and escaped path to prevent injection
    const filterClause = cleanTerm.length > 0 ? ` | Where-Object { $_.Name -like '*${cleanTerm}*' }` : "";
    const script = `Get-ChildItem -LiteralPath ${escapedRoots} -Include '*.prproj' -Recurse -Depth 6 -ErrorAction SilentlyContinue${filterClause} | Select-Object -ExpandProperty FullName -First ${limit}`;

    const stdout = await runPowerShellScript(script, { timeout: 8000, signal });

    return stdout
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && fs.existsSync(p))
      .map((p) => this.normalizePath(p))
      .slice(0, limit);
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
      await open(filePath, appPath);
    } else {
      await open(filePath);
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

    let readError: unknown = null;
    try {
      const versionDirs = await fs.promises.readdir(premiereDocsDir);
      for (const vDir of versionDirs) {
        const fullVDir = path.join(premiereDocsDir, vDir);
        const vStat = await fs.promises.stat(fullVDir).catch(() => null);
        if (!vStat || !vStat.isDirectory()) continue;

        const subEntries = await fs.promises.readdir(fullVDir).catch((err) => {
          readError = err;
          return [];
        });
        const profileDirs = subEntries.filter((s) => s.startsWith("Profile-"));
        const candidateDirs = profileDirs.length > 0 ? profileDirs.map((p) => path.join(fullVDir, p)) : [fullVDir];

        for (const targetDir of candidateDirs) {
          const prefsFile = path.join(targetDir, "Adobe Premiere Pro Prefs");
          try {
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
          } catch (err) {
            readError = err;
          }
        }
      }
    } catch (err) {
      readError = err;
    }

    if (results.length === 0 && readError) {
      throw readError;
    }

    return results;
  }

  public async readWindowsRecentFolder(): Promise<string[]> {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData/Roaming");
    const recentDir = path.join(appData, "Microsoft/Windows/Recent");
    if (!fs.existsSync(recentDir)) return [];

    const escapedRecentDir = recentDir.replace(/'/g, "''");
    const script = `$sh = New-Object -ComObject WScript.Shell; Get-ChildItem -LiteralPath '${escapedRecentDir}' -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object { try { $target = $sh.CreateShortcut($_.FullName).TargetPath; if ($target -and $target.EndsWith('.prproj', [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $target)) { $target } } catch {} }`;

    const stdout = await runPowerShellScript(script, { timeout: 6000 });

    return stdout
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p.toLowerCase().endsWith(".prproj") && fs.existsSync(p))
      .map((p) => this.normalizePath(p));
  }
}
