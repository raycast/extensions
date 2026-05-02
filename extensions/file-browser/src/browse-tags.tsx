import { getPreferenceValues } from "@raycast/api";
import { getExtensionPreferences, getDirectoryBrowserDefaults } from "$lib/preferences";
import { TagBrowser } from "$lib/pages/tag-browser";
import type { EnterKeyAction } from "$lib/components/contents/types";

export default function Command() {
  const preferences = getExtensionPreferences();
  const { enterAction: rawEnterAction } = getPreferenceValues<{ enterAction?: EnterKeyAction }>();
  const directoryBrowserDefaults = getDirectoryBrowserDefaults(preferences);
  const enterAction = rawEnterAction ?? "detail";

  return <TagBrowser enterAction={enterAction} {...directoryBrowserDefaults} />;
}
