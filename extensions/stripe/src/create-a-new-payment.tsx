import { open } from "@raycast/api";
import { QUICK_LINKS } from "@src/enums";

/**
 * Create New Payment Quick Command - Opens Stripe Dashboard payment creation page.
 *
 * This is a no-UI quicklink command that directly opens the Stripe Dashboard
 * to the "Create New Payment" page for rapid payment creation.
 *
 * Useful for quickly creating manual payments without navigating through the extension UI.
 */
export default async () => {
  await open(QUICK_LINKS.NEW_PAYMENT);
};
