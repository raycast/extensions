import { open, showToast, Toast } from "@raycast/api";
import { startPractice } from "./lib/keysi";
import { readTier } from "./lib/tier";

/**
 * Practice Shortcuts.
 *
 * Keysi refuses this over `keysi://` too, and opens its License settings
 * when it does — so the check here is not the lock, it is the explanation.
 * Without it the only feedback would be Keysi's Settings window appearing
 * for no stated reason.
 */
export default async function Command() {
  const tier = readTier();
  if (!tier.unlocked) {
    await showToast({
      style: Toast.Style.Failure,
      title: tier.known ? "Keysi Pro required" : "Keysi isn't set up yet",
      message: tier.known
        ? "Raycast commands are part of Keysi Pro, a one-time purchase. Keysi itself stays free."
        : "Install Keysi from keysi.io and open it once.",
      primaryAction: {
        title: "Open keysi.io",
        onAction: () => {
          void open("https://keysi.io");
        },
      },
    });
    return;
  }
  await startPractice();
}
