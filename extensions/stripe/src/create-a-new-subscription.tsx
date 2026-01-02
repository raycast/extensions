import { open } from "@raycast/api";
import { QUICK_LINKS } from "@src/enums";

/**
 * Create New Subscription Quick Command - Opens Stripe Dashboard subscription creation page.
 *
 * This is a no-UI quicklink command that directly opens the Stripe Dashboard
 * to the "Create New Subscription" page for rapid subscription setup.
 *
 * Useful for quickly creating subscriptions without navigating through the extension UI.
 */
export default async () => {
  await open(QUICK_LINKS.NEW_SUBSCRIPTION);
};
