import { open } from "@raycast/api";
import { QUICK_LINKS } from "@src/enums";

/**
 * Create New Invoice Quick Command - Opens Stripe Dashboard invoice creation page.
 *
 * This is a no-UI quicklink command that directly opens the Stripe Dashboard
 * to the "Create New Invoice" page for rapid invoice creation.
 *
 * Useful for quickly creating invoices without navigating through the extension UI.
 */
export default async () => {
  await open(QUICK_LINKS.NEW_INVOICE);
};
