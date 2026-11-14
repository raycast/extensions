import { openExtensionPreferences } from "@raycast/api";

export default async function Command() {
  await openExtensionPreferences();
}
