import { Toast, closeMainWindow, open, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import * as fs from "fs";
import * as os from "os";
import path from "path";
import { build } from "./lib/preferences";
import { VSCodeBuild } from "./lib/types";
import { isMac, isWin } from "./lib/utils";
import { getEditorApplication } from "./utils/editor";

/**
 * The index of the `New Window` menu item in the `File` menu.
 */
const NewWindowMenuItemIndex: Record<VSCodeBuild, number> = {
  [VSCodeBuild.AntigravityIDE]: 3,
  [VSCodeBuild.Code]: 3,
  [VSCodeBuild.CodeInsiders]: 3,
  [VSCodeBuild.Cursor]: 2,
  [VSCodeBuild.IBMBob]: 3,
  [VSCodeBuild.Kiro]: 3,
  [VSCodeBuild.Positron]: 3,
  [VSCodeBuild.Trae]: 3,
  [VSCodeBuild.TraeCN]: 3,
  [VSCodeBuild.VSCodium]: 3,
  [VSCodeBuild.VSCodiumInsiders]: 3,
  [VSCodeBuild.Devin]: 3,
  [VSCodeBuild.Windsurf]: 3,
  [VSCodeBuild.Lingma]: 3,
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
const makeNewWindowMacOs = async () => {
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
    if (isMac) {
      await makeNewWindowMacOs();
    }
    if (isWin) {
      // Cursor is missing from Raycast's Windows app list, so resolve it by
      // absolute path instead of getEditorApplication().
      if (build === VSCodeBuild.Cursor) {
        const cursorExe = path.join(os.homedir(), "AppData", "Local", "Programs", "cursor", "Cursor.exe");
        if (!fs.existsSync(cursorExe)) {
          throw new Error(`Cursor app not found at ${cursorExe}. Is it installed?`);
        }
        await open(cursorExe);
      } else {
        const editorApp = await getEditorApplication(build);
        if (!editorApp) {
          throw new Error(`${build} app not found. Is it installed?`);
        }
        await open("", editorApp);
      }
    }
  } catch (error) {
    await showToast({
      title: "Failed opening new window",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
