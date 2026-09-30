import { environment } from "@raycast/api";

export const headers: Record<string, string> = {
  "User-Agent": `Raycast/${environment.raycastVersion} (https://raycast.com)`,
};
