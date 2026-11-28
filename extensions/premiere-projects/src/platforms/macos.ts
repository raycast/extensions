import { open } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { IPlatformAdapter } from "./types";

const execFileAsync = promisify(execFile);

export class MacOSPlatformAdapter implements IPlatformAdapter {
  public readonly platformName = "macOS" as const;

  public normalizePath(filePath: string): string {
    const resolved = path.resolve(filePath);
    return path.normalize(resolved);
  }

  public isCaseInsensitive(): boolean {
    return true; // APFS and HFS+ are case-insensitive by default on macOS
  }

  public async getRecentProjectPaths(limit = 60): Promise<string[]> {
    const foundPaths = new Set<string>();
    const orderedList: string[] = [];

    const addPath = (rawPath: string) => {
      if (!rawPath || typeof rawPath !== "string") return;
      const clean = this.normalizePath(rawPath.trim());
      const ext = path.extname(clean).replace(".", "").toLowerCase();
      if (ext !== "prproj") return;

      if (!foundPaths.has(clean) && fs.existsSync(clean)) {
        foundPaths.add(clean);
        orderedList.push(clean);
      }
    };

    const errors: unknown[] = [];

    // 1. Check Premiere Pro Prefs in Documents
    try {
      const prefsPaths = await this.readPremierePrefsRecents();
      for (const p of prefsPaths) addPath(p);
    } catch (err) {
      errors.push(err);
    }

    // 2. Check MediaBrowser Plist in Preferences
    try {
      const mbPaths = await this.readMediaBrowserRecents();
      for (const p of mbPaths) addPath(p);
    } catch (err) {
      errors.push(err);
    }

    // 3. Check Spotlight recent documents
    try {
      const spotlightPaths = await this.querySpotlightRecents(limit);
      for (const p of spotlightPaths) addPath(p);
    } catch (err) {
      errors.push(err);
    }

    // If no recent files were discovered and errors occurred, throw so the UI can show a retry action
    if (orderedList.length === 0 && errors.length > 0) {
      const details = errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ");
      throw new Error(`Failed to discover recent Premiere Pro projects: ${details}`);
    }

    return orderedList.slice(0, limit);
  }

  public async searchProjectPaths(
    searchTerm = "",
    scope: "home" | "all" | string = "home",
    limit = 100,
    signal?: AbortSignal,
  ): Promise<string[]> {
    let scopeDir: string | undefined;
    if (scope === "home") {
      scopeDir = os.homedir();
    } else if (scope === "system") {
      scopeDir = "/";
    } else if (scope === "all" || scope === "global") {
      scopeDir = undefined;
    } else {
      if (!fs.existsSync(scope)) {
        throw new Error(`Search location does not exist or is not mounted: ${scope}`);
      }
      scopeDir = scope;
    }
    const trimmed = searchTerm.trim();

    const baseCondition = "kMDItemFSName == '*.prproj'c";
    let query: string;

    if (trimmed.length === 0) {
      query = baseCondition;
    } else {
      // Sanitize query to avoid breaking mdfind syntax
      const cleanTerm = trimmed.replace(/['"\\]/g, "");
      query = `${baseCondition} && (kMDItemFSName == '*${cleanTerm}*'c || kMDItemDisplayName == '*${cleanTerm}*'c)`;
    }

    let paths = await this.runMdfind(query, scopeDir, limit, signal);

    // Isolate results to prevent cross-volume mixing
    if (scope === "system") {
      paths = paths.filter((p) => !p.startsWith("/Volumes/"));
    } else if (scope === "home") {
      const home = os.homedir();
      paths = paths.filter((p) => p.startsWith(home + "/") || p === home);
    } else if (scope.startsWith("/Volumes/")) {
      const prefix = scope.endsWith("/") ? scope : scope + "/";
      paths = paths.filter((p) => p.startsWith(prefix) || p === scope);
    }

    return paths;
  }

  public getMediaCacheDirectories(): string[] {
    const commonDir = path.join(os.homedir(), "Library/Application Support/Adobe/Common");
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
    await execFileAsync("/usr/bin/open", ["-R", filePath], { timeout: 5000 });
  }

  public async getAppInstallationPath(): Promise<string | null> {
    const applicationsDir = "/Applications";
    try {
      if (!fs.existsSync(applicationsDir)) return null;
      const entries = await fs.promises.readdir(applicationsDir);
      // Look for Adobe Premiere Pro folders e.g. "Adobe Premiere Pro 2026", "Adobe Premiere Pro 2025"
      const premiereFolders = entries
        .filter((e) => e.startsWith("Adobe Premiere Pro") && !e.endsWith(".zip"))
        .sort()
        .reverse();

      for (const folder of premiereFolders) {
        const fullFolder = path.join(applicationsDir, folder);
        const stat = await fs.promises.stat(fullFolder);
        if (stat.isDirectory()) {
          const appEntries = await fs.promises.readdir(fullFolder);
          const appBundle = appEntries.find((f) => f.endsWith(".app"));
          if (appBundle) {
            return path.join(fullFolder, appBundle);
          }
        }
      }
    } catch {
      // Non-blocking
    }
    return null;
  }

  /**
   * Reads Adobe Premiere Pro Prefs XML files across installed profile versions.
   */
  public async readPremierePrefsRecents(): Promise<string[]> {
    const results: string[] = [];
    const premiereDocsDir = path.join(os.homedir(), "Documents/Adobe/Premiere Pro");
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

        // If no Profile-* folder, check if Prefs file sits directly in version folder
        const candidateDirs = profileDirs.length > 0 ? profileDirs.map((p) => path.join(fullVDir, p)) : [fullVDir];

        for (const targetDir of candidateDirs) {
          const prefsFile = path.join(targetDir, "Adobe Premiere Pro Prefs");
          try {
            if (fs.existsSync(prefsFile)) {
              const content = await fs.promises.readFile(prefsFile, "utf8");
              // Match <BE.Prefs.MRU.Document.0>path</BE.Prefs.MRU.Document.0>
              const mruRegex = /<BE\.Prefs\.MRU\.Document\.\d+>([^<]+)<\/BE\.Prefs\.MRU\.Document\.\d+>/gi;
              let match: RegExpExecArray | null;
              while ((match = mruRegex.exec(content)) !== null) {
                const p = match[1].trim();
                if (p && fs.existsSync(p)) {
                  results.push(p);
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

  /**
   * Reads com.adobe.mediabrowser.plist which tracks recent Adobe documents.
   */
  public async readMediaBrowserRecents(): Promise<string[]> {
    const plistPath = path.join(os.homedir(), "Library/Preferences/com.adobe.mediabrowser.plist");
    if (!fs.existsSync(plistPath)) return [];

    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", plistPath], {
      timeout: 4000,
      encoding: "utf8",
    });

    const paths: string[] = [];
    const regex = /<key>file-path<\/key>\s*<string>([^<]+)<\/string>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(stdout)) !== null) {
      const candidate = match[1].trim();
      if (candidate.endsWith(".prproj") && fs.existsSync(candidate)) {
        paths.push(candidate);
      }
    }
    return paths;
  }

  private async querySpotlightRecents(limit: number): Promise<string[]> {
    const query = "(kMDItemFSName == '*.prproj'c) && kMDItemLastUsedDate != null";
    return this.runMdfind(query, undefined, limit);
  }

  private async runMdfind(query: string, scope?: string, limit = 100, signal?: AbortSignal): Promise<string[]> {
    const args = ["-onlyin", scope || os.homedir(), query];
    if (!scope) {
      args.shift();
      args.shift();
    }

    const { stdout } = await execFileAsync("/usr/bin/mdfind", args, {
      timeout: 5000,
      maxBuffer: 4 * 1024 * 1024,
      signal,
    });

    return stdout
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && fs.existsSync(p))
      .slice(0, limit);
  }
}
