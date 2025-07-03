import { fetchMainDisplay } from "../commands";

/**
 * Get a JSON list of the main display.
 * This command allows you to identify which display is the main one.
 */
export default async function getMainDisplays() {
  const mainDisplay = await fetchMainDisplay();
  return mainDisplay;
}
