import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { openLink } from "./forkz";

/** The folder of Finder's front window, if there is one. */
async function frontFinderFolder(): Promise<string | undefined> {
  try {
    const path = await runAppleScript(
      'tell application "Finder" to if (count of Finder windows) > 0 then return POSIX path of (target of front Finder window as alias)',
    );
    return path.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** The selected item (selected in forkz), or the front window's folder. */
export default async function Command() {
  let selected: string | undefined;
  try {
    selected = (await getSelectedFinderItems())[0]?.path;
  } catch {
    selected = undefined;
  }
  const path = selected ?? (await frontFinderFolder());
  if (!path) {
    await showHUD("Open a folder in Finder first");
    return;
  }
  await openLink("open", { path });
}
