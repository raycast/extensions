import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { SubMenuType } from "./constants";

const DEFAULT_ERROR =
  "Could not perform the window-tiling action. Check that macOS Sequoia ‘Enable Window Tiling’ is on and Raycast has Accessibility permission.";

export async function invokeMenu(menuItemName: string, sub?: SubMenuType) {
  const p = getPreferenceValues();

  const windowMenu = p.windowMenuTitle || "Window";
  const subMenu =
    sub === SubMenuType.MoveResize
      ? p.moveResizeMenuTitle || "Move & Resize"
      : sub === SubMenuType.FullScreenTile
        ? p.fullScreenTileMenuTitle || "Full Screen Tile"
        : undefined;

  if (!menuItemName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Menu Item Label missing",
      message: "Set it in Command Preferences.",
    });
    return;
  }

  const script = `
    tell application "System Events"
      try
        click menu item "${menuItemName}" of menu 1 ${
          subMenu ? `of menu item "${subMenu}" of menu 1 ` : ""
        }of menu bar item "${windowMenu}" of menu bar 1 of (first application process whose frontmost is true)
      end try
    end tell
  `;
  try {
    await runAppleScript(script);
  } catch (error) {
    await showFailureToast(error, { title: DEFAULT_ERROR });
  }
}
