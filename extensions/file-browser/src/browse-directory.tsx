import { getPreferenceValues } from "@raycast/api";
import { resolveStartDirectory } from "$lib/utils";
import { SessionViewProvider } from "$lib/pages/directory-browser/session-view-context";
import { DirectoryBrowser } from "$lib/pages/directory-browser";
import { getDirectoryBrowserDefaults } from "$lib/preferences";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
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
