import { environment } from "@raycast/api";

export const headers: HeadersInit = {
  "User-Agent": `Raycast/${environment.raycastVersion} (https://raycast.com)`,
};
