import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const DEFAULT_ERROR =
  "Could not perform the window-tiling action. Check that macOS Sequoia ‘Enable Window Tiling’ is on and Raycast has Accessibility permission.";

type SubMenu = "moveResize" | "fullScreenTile";

export async function invokeMenu(menuItemName: string, sub?: SubMenu) {
  const p = getPreferenceValues();

  const windowMenu = p.windowMenuTitle || "Window";
  const subMenu =
    sub === "moveResize"
      ? p.moveResizeMenuTitle || "Move & Resize"
      : sub === "fullScreenTile"
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
  } catch {
    await showToast({ style: Toast.Style.Failure, title: DEFAULT_ERROR });
  }
}

export type SubMenuType = SubMenu;
