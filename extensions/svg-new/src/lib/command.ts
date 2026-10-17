import { getSelectedFinderItems, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "fs";
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

/** A path in `dir` for `name` plus each extension that none of the existing files use ("logo 2.svg"). */
export function availablePaths(dir: string, name: string, exts: string[]): string[] {
  for (let n = 1; ; n++) {
    const candidates = exts.map((ext) => path.join(dir, `${n === 1 ? name : `${name} ${n}`}${ext}`));
    if (!candidates.some((file) => existsSync(file))) return candidates;
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
