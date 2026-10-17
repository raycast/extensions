import { getSelectedFinderItems, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync, promises as fs } from "fs";
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
        await fs.writeFile(paths[i], file.data, { flag: "wx" });
        written.push(paths[i]);
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
