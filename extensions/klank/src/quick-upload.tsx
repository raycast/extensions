/**
 * Quick Upload command for Raycast
 * Opens the Klank upload page directly
 */

import { open } from "@raycast/api";
import { getApiUrl } from "./api";

export default async function QuickUploadCommand() {
  const apiUrl = getApiUrl();
  await open(`${apiUrl}/app/create`);
}
