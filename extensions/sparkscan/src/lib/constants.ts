import os from "node:os";

import { environment } from "@raycast/api";

/**
 * The base headers for all API requests.
 */
export const BASE_HEADERS = {
  Accept: "application/json",
  "User-Agent": `Sparkscan Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
} as const;
