import {
  Clipboard,
  LaunchType,
  Toast,
  getSelectedFinderItems,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { bar, isFile, plan, transfer } from "./uploader";
import { loadConfig } from "./config";

export default async function Command() {
  const { host, remoteDir } = await loadConfig();

  if (!host) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Set up VPS Upload first",
      message: "Opening setup…",
    });
    try {
      await launchCommand({ name: "upload", type: LaunchType.UserInitiated });
    } catch {
      // Could not launch the setup command — the toast already explains.
    }
    return;
  }

  let selected: string[] = [];
  try {
    const items = await getSelectedFinderItems();
    selected = items.map((i) => i.path).filter(isFile);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected",
      message: "Select file(s) in Finder, then run this command.",
    });
    return;
  }

  const { valid, targets } = plan(selected, remoteDir);
  if (valid.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected in Finder",
      message: "Select one or more files (not folders) and try again.",
    });
    return;
  }

  // Copy the remote path(s) to the clipboard right away.
  await Clipboard.copy(targets.join(" "));

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Uploading to ${host}`,
    message: bar(0),
  });

  try {
    await transfer(valid, targets, host, remoteDir, {
      onProgress: (pct) => {
        toast.message = bar(pct);
      },
      onStatus: (s) => {
        toast.title = s;
      },
    });
    toast.style = Toast.Style.Success;
    toast.title =
      valid.length > 1 ? `Uploaded ${valid.length} files` : "Uploaded";
    toast.message = "Remote path copied to clipboard";
    await showHUD("☁ Uploaded — remote path copied");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    toast.style = Toast.Style.Failure;
    toast.title = "Upload failed";
    toast.message = msg;
  }
}
