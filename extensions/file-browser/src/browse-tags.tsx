import { getExtensionPreferences, getDirectoryBrowserDefaults } from "$lib/preferences";
import { TagBrowser } from "$lib/pages/tag-browser";

export default function Command() {
  const preferences = getExtensionPreferences();
  const directoryBrowserDefaults = getDirectoryBrowserDefaults(preferences);

  return <TagBrowser {...directoryBrowserDefaults} />;
}
