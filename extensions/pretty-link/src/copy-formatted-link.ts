import { getPreferenceValues } from "@raycast/api";
import { copyActiveLink } from "./utils/copy-active-link";
import { ensureBrowserExtensionAccess } from "./utils/ensure-browser-extension-access";

export default async function main() {
  const canAccessBrowserExtension = await ensureBrowserExtensionAccess();
  if (!canAccessBrowserExtension) {
    return;
  }

  const { githubNonUrgentPrefix, plainNonUrgentPrefix } =
    getPreferenceValues<Preferences.CopyFormattedLink>();

  await copyActiveLink({
    githubPrefix: githubNonUrgentPrefix,
    plainPrefix: plainNonUrgentPrefix,
  });
}
