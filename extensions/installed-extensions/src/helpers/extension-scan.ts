import fs from "fs/promises";
import os from "os";
import path from "path";
import { showFailureToast } from "@raycast/utils";
import { LOCAL_EXTENSION_UUID_PATTERN } from "./constants";
import { ExtensionMetadata } from "../types";
import { isWindows } from "./utils";

export function packageJsonMatchesExtensionFilter(packageJsonPath: string, filter: string): boolean {
  if (filter === "all") return true;
  const extDir = path.dirname(packageJsonPath);
  const isLocal = !LOCAL_EXTENSION_UUID_PATTERN.test(extDir);
  if (filter === "local") return isLocal;
  if (filter === "store") return !isLocal;
  return true;
}

export async function parsePackageJson(packageJsonPath: string): Promise<ExtensionMetadata | null> {
  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    const stats = await fs.stat(packageJsonPath);
    const json = JSON.parse(content);

    const author: string = json.author;
    const owner: string | undefined = json?.owner;
    const access: string | undefined = json?.access;
    const name: string = json.name;
    const link = `https://raycast.com/${owner ?? author}/${name}`;
    const cleanedPath = path.dirname(packageJsonPath);

    return {
      path: cleanedPath,
      name,
      author,
      icon: json.icon,
      commandCount: Array.isArray(json.commands) ? json.commands.length : 0,
      owner,
      access,
      title: json.title,
      handle: `${owner ?? author}/${name}`,
      link,
      updatedAt: stats.ctime,
      isLocalExtension: !LOCAL_EXTENSION_UUID_PATTERN.test(cleanedPath),
    };
  } catch (e) {
    console.warn(`Skipping extension manifest at ${packageJsonPath}:`, e);
    return null;
  }
}

export async function getPackageJsonFiles(): Promise<string[]> {
  try {
    const extensionsDir = path.join(os.homedir(), ".config", isWindows ? "raycast-x" : "raycast", "extensions");
    const extensions = await fs.readdir(extensionsDir);
    const packageJsonFiles = await Promise.all(
      extensions.map(async (extension) => {
        const packageJsonPath = path.join(extensionsDir, extension, "package.json");
        try {
          await fs.access(packageJsonPath, fs.constants.F_OK);
          return packageJsonPath;
        } catch {
          return null;
        }
      }),
    );
    return packageJsonFiles.filter((file) => file !== null) as string[];
  } catch (e) {
    if (e instanceof Error) {
      showFailureToast(e.message);
      throw new Error(e.message);
    }
    throw new Error("An unknown error occurred");
  }
}
