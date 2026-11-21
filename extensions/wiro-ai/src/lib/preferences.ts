import { getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { CACHE_MAX_AGE_MS, download, pruneFolders, reservePath } from "./files";
import { type Credentials } from "./wiro";

export function credentials(): Credentials {
  const { apiKey, apiSecret } = getPreferenceValues<Preferences>();
  return { apiKey, apiSecret: apiSecret?.trim() ? apiSecret : undefined };
}

/**
 * A short one-way tag for the project behind the API key. Saved conversations are kept per
 * project, so after a key change a conversation is never sent with another project's key.
 */
export function projectScope(): string {
  return createHash("sha256")
    .update(credentials().apiKey ?? "")
    .digest("hex")
    .slice(0, 12);
}

/** Where Save puts files: the Save Folder preference, or Downloads. */
export function saveFolder(): string {
  const { downloadDirectory } = getPreferenceValues<Preferences>();
  return downloadDirectory?.trim() || join(homedir(), "Downloads");
}

/** "Save to Downloads", or the name of the folder the user picked. */
export function saveTitle(): string {
  const { downloadDirectory } = getPreferenceValues<Preferences>();
  return downloadDirectory?.trim() ? `Save to ${basename(downloadDirectory.trim())}` : "Save to Downloads";
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** A file name that is safe on disk, such as `gpt-image-2-123456.png`. */
export function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "wiro-output";
}

const CACHE_ROOT = join(tmpdir(), "wiro-raycast");
let pruning: Promise<unknown> | undefined;
const pendingCopies = new Map<string, Promise<string>>();

/**
 * Downloads an output once into a temporary folder, for Quick Look and the clipboard. Outputs
 * often share a name such as 0.png, so the file name starts with a hash of its address. The
 * first copy of a session first removes the folders that have not changed for three days.
 */
export function cachedCopy(url: string, name: string, group: string): Promise<string> {
  const folder = join(CACHE_ROOT, safeName(group));
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const path = join(folder, `${hash}-${safeName(name)}`);
  let pending = pendingCopies.get(path);
  if (!pending) {
    pending = (async () => {
      pruning ??= pruneFolders(CACHE_ROOT, CACHE_MAX_AGE_MS);
      await pruning;
      await mkdir(folder, { recursive: true });
      if (!(await exists(path))) await download(url, path);
      return path;
    })();
    pending.catch(() => pendingCopies.delete(path));
    pendingCopies.set(path, pending);
  }
  return pending;
}

/**
 * Saves an output into the save folder and returns the saved file's path. A downloaded copy
 * or the original file wins over text, so a text file is saved byte for byte.
 */
export async function saveToFolder(source: { url?: string; localPath?: string; text?: string }, name: string) {
  const local = source.localPath && (await exists(source.localPath)) ? source.localPath : undefined;
  if (!local && !source.url && source.text === undefined) throw new Error("There is nothing to save.");
  const folder = saveFolder();
  await mkdir(folder, { recursive: true });
  const path = await reservePath(folder, safeName(name));
  try {
    if (local) await copyFile(local, path);
    else if (source.url) await download(source.url, path);
    else await writeFile(path, source.text ?? "", "utf8");
  } catch (error) {
    await rm(path, { force: true });
    throw error;
  }
  return path;
}
