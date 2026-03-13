import { open } from "@raycast/api";
import { QUICK_LINKS } from "@src/enums";

/**
 * Create New Product Quick Command - Opens Stripe Dashboard product creation page.
 *
 * This is a no-UI quicklink command that directly opens the Stripe Dashboard
 * to the "Create New Product" page for rapid product setup.
 *
 * Useful for quickly creating products without navigating through the extension UI.
 */
export default async () => {
  await open(QUICK_LINKS.NEW_PRODUCT);
};
