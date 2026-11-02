import { getFrontmostApplication, getSelectedFinderItems } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { isScannable, ScanError } from "./sizewise";

const finderBundleIdentifier = "com.apple.finder";

/** Turns macOS refusing Raycast control of Finder (AppleScript error -1743) into a fixable error. */
function explainFinderError(error: unknown): unknown {
  const message = error instanceof Error ? error.message : String(error);
  if (!/-1743|not (authori[sz]ed|allowed) to send apple events/i.test(message)) return error;
  return new ScanError(
    "Raycast can't control Finder",
    "In System Settings > Privacy & Security > Automation, turn on Finder under Raycast, then try again.",
    {
      title: "Open Automation Settings",
      url: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
    },
  );
}

/**
 * The first folder selected in Finder. With nothing selected, the folder Finder would put a new
 * folder in: the front Finder window's folder, or the desktop when no window is open.
 */
export async function finderFolder(): Promise<string> {
  let selection: string[];
  try {
    selection = (await getSelectedFinderItems()).map((item) => item.path);
  } catch (error) {
    // Raycast also fails here when macOS denies it control of Finder, and telling someone to
    // select a folder wouldn't help then.
    const frontmost = await getFrontmostApplication().catch(() => undefined);
    if (frontmost?.bundleId === finderBundleIdentifier) throw explainFinderError(error);
    throw new ScanError("Finder isn't in front", "Select a folder in Finder, then try again.");
  }
  if (selection.length === 0) {
    try {
      return await runAppleScript(`tell application "Finder" to return POSIX path of (insertion location as alias)`);
    } catch (error) {
      throw explainFinderError(error);
    }
  }
  for (const path of selection) {
    if (await isScannable(path)) return path;
  }
  throw new ScanError("No folder selected", "Select a folder in Finder, then try again.");
}
