import { openExtensionPreferences } from "@raycast/api";

export default async function Settings() {
  await openExtensionPreferences();
}
