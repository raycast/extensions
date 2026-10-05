import { Action, Icon, open, showInFinder, showToast, Toast, Keyboard } from "@raycast/api";
import { CourseFile } from "../lib/contents";
import { downloadFile } from "../lib/download";
import { browserFileUrl } from "../lib/moodle";
import { getDownloadDirectory } from "../lib/prefs";
import { showError } from "./errors";

async function download(file: CourseFile, openAfter: boolean): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading", message: file.name });
  try {
    const path = await downloadFile(file.downloadUrl, file.name, getDownloadDirectory());
    if (openAfter) {
      await open(path);
      toast.hide();
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Downloaded";
    toast.message = path;
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
    toast.secondaryAction = { title: "Open File", onAction: () => open(path) };
  } catch (error) {
    toast.hide();
    await showError(error, "Download failed");
  }
}

/** Actions shared by every file item: download, open, copy link. */
export function FileActions({ file }: { file: CourseFile }) {
  const browserUrl = browserFileUrl(file.downloadUrl);
  return (
    <>
      <Action title="Download File" icon={Icon.Download} onAction={() => download(file, false)} />
      <Action
        title="Download and Open"
        icon={Icon.ArrowNe}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => download(file, true)}
      />
      <Action.OpenInBrowser title="Open in Browser" url={browserUrl} shortcut={{ modifiers: ["cmd"], key: "return" }} />
      <Action.CopyToClipboard title="Copy Link" content={browserUrl} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </>
  );
}
