import { Clipboard, environment, openCommandPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { copyFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isSaved } from "../lib/history";
import { downloadFile, errorMessage } from "../lib/replicate";

const outputFileName = (url: string) => {
  if (isSaved(url)) return basename(fileURLToPath(url));
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const name = segments.at(-2) ?? "replicate";
  return `${name}${extname(segments.at(-1) ?? "") || ".png"}`;
};

export const copyOutputFile = async (url: string) => {
  const toast = await showToast(Toast.Style.Animated, "Copying...");
  try {
    const file = isSaved(url)
      ? fileURLToPath(url)
      : await downloadFile(url, join(environment.supportPath, outputFileName(url)));
    await Clipboard.copy({ file });
    toast.hide();
    await showHUD("✅ Copied to clipboard!");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Copy the File";
    toast.message = errorMessage(error);
  }
};

export const saveOutputFile = async (url: string) => {
  const destination = join(homedir(), "Downloads", outputFileName(url));
  const toast = await showToast(Toast.Style.Animated, "Saving...");
  try {
    if (isSaved(url)) await copyFile(fileURLToPath(url), destination);
    else await downloadFile(url, destination);
    toast.hide();
    await showHUD(`✅ Saved to ${destination}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Save the File";
    toast.message = errorMessage(error);
  }
};

export const showAuthError = (title?: string, message?: string) =>
  showToast({
    title: title ?? "Replicate Rejected the Request",
    message,
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Update Token",
      onAction: openCommandPreferences,
    },
  });
