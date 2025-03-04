import { fetchDisplays } from "../commands";

/**
 * Get a JSON list of all available displays.
 * The important information is the `tagID` and `name` of each display.
 * This command also allows you to identify which display is a Display (physical)
 * which is a VirtualScreen using the `deviceType` property.
 * Present the options in the form of a markdown table.
 */
export default async function getDisplays() {
  const displays = await fetchDisplays();
  return displays;
}
