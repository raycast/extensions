import { launchCommand, LaunchType } from "@raycast/api";

const MENU_BAR_COMMAND = "menu-bar";

/**
 * Re-run the MRR & Cash menu-bar command now instead of on its 15-minute
 * interval, after something it shows has changed (active company, sign-in,
 * sign-out).
 *
 * A background launch is the documented way, but Raycast refuses it until
 * the command's background refresh has been activated (a fresh install, or a
 * development copy whose commands were imported disabled). A user-initiated
 * launch then does the same thing as running the command from root search:
 * the menu-bar item re-renders, no window opens. Both fail when the user has
 * disabled the command; nothing to refresh then.
 */
export async function refreshMenuBar(): Promise<void> {
    try {
        await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background });
        return;
    } catch (error) {
        console.warn("Background menu-bar refresh refused, launching it directly:", error);
    }
    try {
        await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.UserInitiated });
    } catch (error) {
        console.warn("Menu-bar refresh failed (command disabled?):", error);
    }
}
