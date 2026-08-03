import { LaunchType, environment, launchCommand } from "@raycast/api";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * A Raycast menu-bar command only puts its icon in the menu bar once it has run
 * at least once. We record that first render with a marker file so the Setup
 * screen can show whether the menu bar has been activated yet.
 */

function marker(): string {
  return join(environment.supportPath, ".menubar-activated-v1");
}

/** Records that the menu-bar command has rendered at least once. */
export function markMenuBarActive(): void {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    writeFileSync(marker(), "", "utf8");
  } catch {
    // ignore
  }
}

/** True once the menu-bar command has run (its icon is registered in the menu bar). */
export function isMenuBarActive(): boolean {
  return existsSync(marker());
}

/**
 * Forces the menu-bar command to re-render now by launching it in the background.
 * Use after mutating session state from another command so the icon/menu reflect
 * the change immediately instead of waiting for the next refresh. Best-effort.
 */
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "tracker", type: LaunchType.Background });
  } catch {
    // menu bar will catch up on its own next refresh
  }
}
