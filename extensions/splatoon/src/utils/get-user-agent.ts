import { environment } from "@raycast/api";
import { capitalize } from "./capitalize";

export function getUserAgent() {
  return `Raycast/${environment.raycastVersion} ${capitalize(environment.extensionName)} (${environment.commandName})`;
}
