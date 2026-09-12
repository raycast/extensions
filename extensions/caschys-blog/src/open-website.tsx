import { open } from "@raycast/api";

/**
 * Open Website Command
 *
 * This command simply opens the Caschys Blog website in the default browser.
 * It provides a quick way for users to access the blog directly.
 */
export default async function Command() {
  await open("https://www.stadt-bremerhaven.de");
}
