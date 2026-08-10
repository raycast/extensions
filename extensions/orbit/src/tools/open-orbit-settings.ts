import { open } from "@raycast/api";
import { buildOrbitSettingsUrl } from "../lib/orbit";

/**
 * Opens Orbit settings.
 */
export default async function openOrbitSettings() {
  const url = buildOrbitSettingsUrl();
  await open(url);

  return { url };
}
