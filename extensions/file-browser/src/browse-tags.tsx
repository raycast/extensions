import { getPreferenceValues } from "@raycast/api";
import { TagBrowser } from "$lib/pages/tag-browser";
import { getDirectoryBrowserDefaults } from "$lib/preferences";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const directoryBrowserDefaults = getDirectoryBrowserDefaults(preferences);

  return <TagBrowser {...directoryBrowserDefaults} />;
}
