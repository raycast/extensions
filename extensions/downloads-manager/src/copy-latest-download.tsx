import { popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { getLatestDownload } from "./utils";
import { runAppleScript } from "run-applescript";

function buildCopyToClipboardAppleScript(path: string) {
  return `
    set the clipboard to POSIX file "${path}"  
  `;
}

export default async function main() {
  const latestDownload = await getLatestDownload();
  if (latestDownload === undefined) {
    await showHUD("No downloads found");
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying to clipboard",
  });

  await runAppleScript(buildCopyToClipboardAppleScript(latestDownload!.path));
  toast.style = Toast.Style.Success;
  toast.title = "Copied to clipboard";
  await popToRoot();
}
