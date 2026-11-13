import { getSelectedFinderItems, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { constants, existsSync, promises as fs } from "fs";
import os from "os";
import path from "path";
import { InputError, isSupportedImage, unsupportedImageError } from "./image";
import { ApiError, Progress } from "./svgnew";

/** The image selected in Finder. */
export async function selectedImagePath(): Promise<string> {
  let items: { path: string }[] = [];
  try {
    items = await getSelectedFinderItems();
  } catch {
    // Finder is not the frontmost app.
  }
  if (items.length === 0) throw new InputError("No image selected", "Select an image in Finder first");
  if (!isSupportedImage(items[0].path)) throw unsupportedImageError();
  return items[0].path;
}

/**
 * Where to save results for the image at `filePath`: next to it, or in Downloads when that folder
 * isn't writable (a read-only volume, say). Commands check this before spending a credit.
 */
export async function outputDir(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir, constants.W_OK);
    return dir;
  } catch {
    return downloadsDir();
  }
}

function downloadsDir(): string {
  return path.join(os.homedir(), "Downloads");
}

/**
 * Saves a paid result with saveNewFiles in `dir`, and in Downloads if that folder still refuses the
 * write (permissions or a read-only volume that the check before the API call didn't catch), so a
 * conversion is never lost. Returns the paths and the folder used.
 */
export async function saveResult(
  dir: string,
  name: string,
  files: { ext: string; data: string | Buffer }[],
): Promise<{ paths: string[]; dir: string }> {
  try {
    return { paths: await saveNewFiles(dir, name, files), dir };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (dir === downloadsDir() || !["EACCES", "EPERM", "EROFS"].includes(code ?? "")) throw error;
    return { paths: await saveNewFiles(downloadsDir(), name, files), dir: downloadsDir() };
  }
}

/** " to Downloads" when results went somewhere other than next to the image, for the HUD. */
export function savedWhere(filePath: string, dir: string): string {
  return dir === path.dirname(filePath) ? "" : ` to ${path.basename(dir)}`;
}

/**
 * Saves each file in `dir` as `name` plus its extension, numbered when a name is taken ("logo 2.svg"),
 * and returns the paths. Files are created exclusively, so one that appears in the meantime (another
 * save, say) is never replaced: the attempt is undone and the next number is tried.
 */
export async function saveNewFiles(
  dir: string,
  name: string,
  files: { ext: string; data: string | Buffer }[],
): Promise<string[]> {
  for (let n = 1; ; n++) {
    const paths = files.map((file) => path.join(dir, `${n === 1 ? name : `${name} ${n}`}${file.ext}`));
    if (paths.some((file) => existsSync(file))) continue;
    const written: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        const handle = await fs.open(paths[i], "wx");
        // Ours from here on, so a write that fails partway (a full disk) is removed below.
        written.push(paths[i]);
        try {
          await handle.writeFile(file.data);
        } finally {
          await handle.close();
        }
      }
      return paths;
    } catch (error) {
      await Promise.all(written.map((file) => fs.rm(file, { force: true })));
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

export function showProgress(toast: Toast, title: string) {
  return (progress: Progress) => {
    toast.title = title;
    toast.message = `${progress.percent}%`;
  };
}

export function creditsNote(credits?: number): string {
  if (credits === undefined) return "";
  return ` · ${credits} ${credits === 1 ? "credit" : "credits"} left`;
}

export async function showError(error: unknown, title: string) {
  if (error instanceof InputError) {
    await showToast({ style: Toast.Style.Failure, title: error.message, message: error.detail });
    return;
  }
  if (error instanceof ApiError && error.status === 401) {
    await showFailureToast(error, {
      title,
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }
  await showFailureToast(error, { title });
}
