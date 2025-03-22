import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { build } from "./preferences";
import { VSCodeBuild } from "./types";

/**
 * The index of the `New Window` menu item in the `File` menu.
 */
const NewWindowMenuItemIndex: Record<VSCodeBuild, number> = {
  [VSCodeBuild.Code]: 3,
  [VSCodeBuild.Cursor]: 2,
  [VSCodeBuild.Insiders]: 3,
  [VSCodeBuild.VSCodium]: 3,
  [VSCodeBuild.Windsurf]: 3,
};

/**
 * Open a new window by clicking the `New Window` menu item in `File` menu.
 *
 * If the user has used a language pack,
 * the menu item cannot be accessed by label,
 * so we use index here.
 *
 * The `menu bar item 3` is the `File` menu.
 * The index starts from 1, and the 1st menu is Apple logo, the 2nd is `Code`, the 3rd is `File`.
 *
 * In most cases, the `New Window` menu item is in the third position.
 * However, for Cursor, which does not have a `New File` menu item, `New Window` is in the second position.
 * We need to handle this case specially.
 */
const makeNewWindow = async () => {
  await runAppleScript(`
    tell application "${build}"
	    activate
    end tell
    delay(0.5)
    tell application "${build}"
	    activate
    end tell

    tell application "System Events"
	    tell process "${build}"
        tell menu bar 1
          tell menu bar item 3
            tell menu 1
              click menu item ${NewWindowMenuItemIndex[build as VSCodeBuild] || 3}
            end tell
          end tell
        end tell
	    end tell
    end tell
  `);
};

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening new window",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
