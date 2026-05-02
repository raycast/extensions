import { getExtensionPreferences, getDirectoryBrowserDefaults } from "$lib/preferences";
import { resolveStartDirectory } from "$lib/utils";
import { SessionViewProvider } from "$lib/pages/directory-browser/session-view-context";
import { DirectoryBrowser } from "$lib/pages/directory-browser";

export default function Command() {
  const preferences = getExtensionPreferences();
  const preferenceDefaultPath = resolveStartDirectory(preferences.startDirectory);

  const directoryBrowserDefaults = getDirectoryBrowserDefaults(preferences);

  return (
    <SessionViewProvider
      initialView={directoryBrowserDefaults.initialView}
      initialSort={directoryBrowserDefaults.initialSort}
    >
      <DirectoryBrowser path={preferenceDefaultPath} {...directoryBrowserDefaults} />
    </SessionViewProvider>
  );
}
