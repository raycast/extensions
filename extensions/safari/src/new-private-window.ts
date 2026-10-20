import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { newPrivateWindow } from "./safari";
import { safariAppIdentifier } from "./utils";

export default async function Command() {
  try {
    // Dismiss Raycast before Safari activates so it does not reclaim keyboard focus.
    await closeMainWindow();

    const result = await newPrivateWindow();

    switch (result.trim()) {
      case "ok":
        // The new window is its own confirmation, as in the New Window command.
        break;
      case "disabled":
        await showToast({
          style: Toast.Style.Failure,
          title: "Private browsing is unavailable",
          message: "New Private Window is blocked by Screen Time or a configuration profile.",
        });
        break;
      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't find the menu item",
          message: `${safariAppIdentifier}'s File menu has no “New Private Window” entry — private browsing may be restricted by Screen Time or a configuration profile.`,
        });
    }
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open a new private window",
      message:
        error instanceof Error && /not allowed assistive access|1002/i.test(error.message)
          ? "Grant Raycast Accessibility access in System Settings → Privacy & Security."
          : error instanceof Error
            ? error.message
            : undefined,
    });
  }
}
