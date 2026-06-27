import path from "path";
import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { apiFetch } from "./api";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const execFileAsync = promisify(execFile);

export interface ZedExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  authors: string[];
  repository: string;
  schema_version: number;
  wasm_api_version: string | null;
  provides: string[];
  published_at: string;
  download_count: number;
}

export interface ZedResponse {
  data: ZedExtension[];
}

interface InstallExtensionOptions {
  downloadUrl: string;
  extensionId: string;
  targetInstallDir: string;
  silent?: boolean;
}

interface InstalledExtension {
  id: string;
  version: string;
}

export interface ExtensionVersionInfo {
  published_at: string;
  version: string;
  schema_version: number;
  wasm_api_version: string | null;
}

export function getLatestExtensionDownloadUrl(ext: ZedExtension): string {
  return `https://api.zed.dev/extensions/${ext.id}/download?min_schema_version=1&max_schema_version=${ext.schema_version}&min_wasm_api_version=0.0.1&max_wasm_api_version=${ext.wasm_api_version || "1.0.0"}`;
}

export function getVersionedExtensionDownloadUrl(extensionId: string, version: string): string {
  return `https://api.zed.dev/extensions/${extensionId}/${version}/download`;
}

export function isExtensionOutdated(
  ext: ZedExtension,
  installedVersion: string | undefined,
  ignoredMap: Record<string, unknown>,
): boolean {
  return (
    !!installedVersion && installedVersion !== "unknown" && installedVersion !== ext.version && !(ext.id in ignoredMap)
  );
}

export function parseAuthor(authorString: string): { name: string; email?: string } {
  const emailStartIdx = authorString.lastIndexOf("<");
  const emailEndIdx = authorString.lastIndexOf(">");

  if (emailStartIdx === -1 || emailEndIdx === -1 || emailEndIdx < emailStartIdx) {
    return { name: authorString.trim(), email: undefined };
  }

  const name = authorString.slice(0, emailStartIdx).trim();
  const email = authorString.slice(emailStartIdx + 1, emailEndIdx).trim();

  return { name, email };
}

export function includesAllWords(text: string, query: string): boolean {
  if (!query) return true;

  const searchWords = query.toLowerCase().trim().split(/\s+/);
  const cleanText = text.toLowerCase();

  return searchWords.every((word) => cleanText.includes(word));
}

export function getDomainLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    const platformRegistry: Record<string, string> = {
      "github.com": "GitHub",
      "gitlab.com": "GitLab",
      "bitbucket.org": "BitBucket",
      "sourceforge.net": "SourceForge",
    };

    const matchedKey = Object.keys(platformRegistry).find((key) => hostname.includes(key));

    if (matchedKey) {
      return platformRegistry[matchedKey];
    }

    const cleanName = hostname.replace("www.", "").split(".")[0];
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  } catch {
    return "Repository";
  }
}

export async function installExtension({
  downloadUrl,
  extensionId,
  targetInstallDir,
  silent = false,
}: InstallExtensionOptions): Promise<void> {
  const installId = `${extensionId}-${Date.now()}-${randomUUID()}`;
  const tempFilePath = path.join(os.tmpdir(), `${installId}.tar.gz`);
  const finalDestDir = path.join(targetInstallDir, extensionId);
  const tempExtractDir = path.join(targetInstallDir, `.tmp-${installId}`);
  const backupDestDir = path.join(targetInstallDir, `.backup-${installId}`);
  let hasBackup = false;

  try {
    const response = await apiFetch(downloadUrl, { silent });

    if (!response.body) throw new Error("Response body is empty");

    await pipeline(
      Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(tempFilePath),
    );

    await fs.mkdir(targetInstallDir, { recursive: true });
    await fs.mkdir(tempExtractDir, { recursive: true });
    await execFileAsync("tar", ["-xzf", tempFilePath, "-C", tempExtractDir]);

    try {
      await fs.rename(finalDestDir, backupDestDir);
      hasBackup = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    await fs.rename(tempExtractDir, finalDestDir);

    hasBackup = false;
    await safeRemovePath(backupDestDir, { recursive: true, force: true });
  } catch (error) {
    await safeRemovePath(tempExtractDir, { recursive: true, force: true });

    if (hasBackup) {
      const restored = await restoreBackupDir(backupDestDir, finalDestDir);
      if (restored) {
        hasBackup = false;
      }
    }
    throw error;
  } finally {
    await safeRemovePath(tempFilePath, { force: true });
    await safeRemovePath(tempExtractDir, { recursive: true, force: true });

    if (!hasBackup) {
      await safeRemovePath(backupDestDir, { recursive: true, force: true });
    }
  }
}

async function restoreBackupDir(backupDestDir: string, finalDestDir: string): Promise<boolean> {
  try {
    await fs.rename(backupDestDir, finalDestDir);
    return true;
  } catch (error) {
    console.error(`Failed to restore backup directory from ${backupDestDir} to ${finalDestDir}:`, error);
    return false;
  }
}

async function safeRemovePath(targetPath: string, options: { recursive?: boolean; force?: boolean }): Promise<void> {
  try {
    await fs.rm(targetPath, options);
  } catch (error) {
    console.error(`Failed to remove path ${targetPath}:`, error);
  }
}

export async function getInstalledExtensions(extensionsDir: string): Promise<InstalledExtension[]> {
  const installedFolderPath = path.join(extensionsDir, "installed");

  try {
    const entries = await fs.readdir(installedFolderPath, { withFileTypes: true });
    const folders = entries.filter(
      (entry) => !entry.name.startsWith(".") && (entry.isDirectory() || entry.isSymbolicLink()),
    );

    const tasks = folders.map(async (entry) => {
      const extensionId = entry.name;
      const extensionDir = path.join(installedFolderPath, extensionId);

      const version = await getExtensionVersionFromDisk(extensionDir);

      return { id: extensionId, version };
    });

    return await Promise.all(tasks);
  } catch (error) {
    console.error("Failed to scan installed extensions directory:", error);
    return [];
  }
}

async function getExtensionVersionFromDisk(extensionDir: string): Promise<string> {
  try {
    const tomlPath = path.join(extensionDir, "extension.toml");
    const tomlContent = await fs.readFile(tomlPath, "utf-8");

    const versionMatch = tomlContent.match(/^version\s*=\s*["']([^"']+)["']/m);
    if (versionMatch) return versionMatch[1];
  } catch {
    // Fail silently and fall through to look for package.json
  }

  try {
    const jsonPath = path.join(extensionDir, "package.json");
    const jsonContent = await fs.readFile(jsonPath, "utf-8");
    const manifest = JSON.parse(jsonContent);

    if (manifest.version) return manifest.version;
  } catch {
    // Return unknown (only if JSON also failed)
  }
  return "unknown";
}

export async function getExtensionVersions(extensionId: string): Promise<ExtensionVersionInfo[]> {
  const response = await apiFetch(`https://api.zed.dev/extensions/${extensionId}`);

  const json = (await response.json()) as ZedResponse;
  const data = json.data || [];
  return data
    .map((item) => ({
      published_at: item.published_at,
      version: item.version,
      schema_version: item.schema_version,
      wasm_api_version: item.wasm_api_version,
    }))
    .sort((a, b) => {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
}
