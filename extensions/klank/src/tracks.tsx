/**
 * View Tracks command for Raycast
 * Opens the Klank tracks page directly
 */

import { open } from "@raycast/api";
import { getApiUrl } from "./api";

export default async function TracksCommand() {
  const apiUrl = getApiUrl();
  await open(`${apiUrl}/app/tracks`);
}
