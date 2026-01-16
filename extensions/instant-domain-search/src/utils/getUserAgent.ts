import { environment } from "@raycast/api";

export default function getUserAgent() {
  return `Raycast/${environment.raycastVersion} ${environment.extensionName} (${environment.commandName})`;
}
