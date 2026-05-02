import { getPreferenceValues } from "@raycast/api";
import { getExtensionPreferences, getDirectoryBrowserDefaults } from "$lib/preferences";
import { resolveStartDirectory } from "$lib/utils";
import { SessionViewProvider } from "$lib/pages/directory-browser/session-view-context";
import { DirectoryBrowser } from "$lib/pages/directory-browser";
import type { EnterKeyAction } from "$lib/components/contents/types";

export default function Command() {
  const preferences = getExtensionPreferences();
  const { enterAction: rawEnterAction } = getPreferenceValues<{ enterAction?: EnterKeyAction }>();
  const preferenceDefaultPath = resolveStartDirectory(preferences.startDirectory);

  const directoryBrowserDefaults = getDirectoryBrowserDefaults(preferences);
  const enterAction = rawEnterAction ?? "detail";

  return (
    <SessionViewProvider
      initialView={directoryBrowserDefaults.initialView}
      initialSort={directoryBrowserDefaults.initialSort}
    >
      <DirectoryBrowser path={preferenceDefaultPath} enterAction={enterAction} {...directoryBrowserDefaults} />
    </SessionViewProvider>
  );
}
