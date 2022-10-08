import { popToRoot, showHUD } from "@raycast/api";
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

  await runAppleScript(buildCopyToClipboardAppleScript(latestDownload!.path));
  await popToRoot();
}
