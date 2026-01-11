/**
 * View Albums command for Raycast
 * Opens the Klank albums page directly
 */

import { open } from "@raycast/api";
import { getApiUrl } from "./api";

export default async function AlbumsCommand() {
  const apiUrl = getApiUrl();
  await open(`${apiUrl}/app/albums`);
}
