import { getPreferenceValues } from "@raycast/api";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Preferences } from "../types";
import { isReadWrite, isSubdirectory } from "./file-utils";
import ToastableError from "./toastable-error";

export async function getVaultPath(): Promise<string> {
  const { vaultPath } = getPreferenceValues<Preferences>();
  if (vaultPath == null || !vaultPath.trim()) {
    throw new ToastableError(
      "Configuration Error",
      "Vault Path is a required preference that must be set to an absolute path."
    );
  }

  // The vault must be an absolute path to a folder on the disk.
  // It can either be a path starting from root (/path/to/vault)
  // Or a path starting from the home directlry (~/documents/vault)
  let result: string;
  if (path.isAbsolute(vaultPath)) {
    result = vaultPath;
  } else if (vaultPath.startsWith("~/")) {
    result = `${os.homedir()}${vaultPath.slice(1)}`;
  } else {
    throw new ToastableError(
      "Configuration Error",
      "Vault Path is a required preference that must be set to an absolute path."
    );
  }

  // The path must exist on disk and be a directory.
  try {
    const stat = await fs.stat(result);
    if (!stat.isDirectory()) {
      throw new ToastableError(
        "Configuration Error",
        `Vault Path points to a file, instead of a directory: ${vaultPath}`
      );
    }
  } catch {
    throw new ToastableError("Configuration Error", `Vault Path did not link to an existing directory: ${vaultPath}`);
  }

  // And finally, the directory must be read/write accessible.
  if (!(await isReadWrite(result))) {
    throw new ToastableError("Configuration Error", `Vault Path is not read/write accessible: ${vaultPath}`);
  }

  return result;
}

export async function getOrCreateBookmarksPath(): Promise<string> {
  const vaultPath = await getVaultPath();

  const { bookmarksPath } = getPreferenceValues<Preferences>();
  const fullBookmarksPath = path.resolve(path.join(vaultPath, bookmarksPath));
  if (fullBookmarksPath !== vaultPath && !isSubdirectory(vaultPath, fullBookmarksPath)) {
    // We don't want someone to try to spoof their way into a directory they shouldn't have access to.
    // The bookmarks directory *must* be a child directory (or just the root) of the Obsidian vault.
    throw new ToastableError(
      "Configuration Error",
      "The Bookmarks path must be a subdirectory of your Obsidian Vault."
    );
  }

  // Now we need to create the path to where we save bookmarks, if it doesn't already exist.
  // At this point, we can guarantee that:
  // 1. The Vault exists and is read/writeable (otherwise the getVaultPath call would've errored).
  // 2. The bookmarks path is a valid subdirectory.
  // So we need to try:
  // 1. Checking to see if the bookmarks directory exists.
  // 2. If it does, then it must be read/write friendly.
  // 3. Otherwise, we need to be able to successfully create it.
  try {
    const stat = await fs.stat(fullBookmarksPath);
    // We found something at this path. Let's make sure it's a directory and that it's read/write accessible.
    if (!stat.isDirectory()) {
      throw new ToastableError(
        "Configuration Error",
        "The Bookmarks path must be a directory, but a file was found instead."
      );
    } else if (!(await isReadWrite(fullBookmarksPath))) {
      throw new ToastableError(
        "Configuration Error",
        "The Bookmarks path must be to a directory with proper read/write permissions set."
      );
    }
  } catch {
    // The bookmarks folder doesn't exist yet. That's ok! Let's try to create it.
    try {
      await fs.mkdir(fullBookmarksPath, { recursive: true });
    } catch (err) {
      // We failed to create the folder. But I wouldn't be sure why at this point.
      // So we'll show the toast, but show the configuration error message.
      // (We *should* have write access at this point, so only issue would be something weird
      // and probably recoverable on a retry.)
      throw new ToastableError(
        "Could not create Bookmarks directory",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return fullBookmarksPath;
}

export async function getSaveSubfolderPath(): Promise<string> {
  const vaultPath = await getVaultPath();
  const { saveSubfolder, bookmarksPath } = getPreferenceValues<Preferences>();

  // If no save subfolder specified, use bookmarksPath
  const savePath = saveSubfolder?.trim() ? saveSubfolder : bookmarksPath;

  const fullSavePath = path.resolve(path.join(vaultPath, savePath));
  if (fullSavePath !== vaultPath && !isSubdirectory(vaultPath, fullSavePath)) {
    throw new ToastableError(
      "Configuration Error",
      "The Save subfolder path must be a subdirectory of your Obsidian Vault."
    );
  }

  // Create the save directory if it doesn't exist
  try {
    const stat = await fs.stat(fullSavePath);
    if (!stat.isDirectory()) {
      throw new ToastableError(
        "Configuration Error",
        "The Save subfolder path must be a directory, but a file was found instead."
      );
    } else if (!(await isReadWrite(fullSavePath))) {
      throw new ToastableError(
        "Configuration Error",
        "The Save subfolder path must be to a directory with proper read/write permissions set."
      );
    }
  } catch {
    try {
      await fs.mkdir(fullSavePath, { recursive: true });
    } catch (err) {
      throw new ToastableError(
        "Could not create Save subfolder directory",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return fullSavePath;
}
