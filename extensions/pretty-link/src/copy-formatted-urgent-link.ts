import { getPreferenceValues } from "@raycast/api";
import { copyActiveLink } from "./utils/copy-active-link";
import { ensureBrowserExtensionAccess } from "./utils/ensure-browser-extension-access";

export default async function main() {
  const canAccessBrowserExtension = await ensureBrowserExtensionAccess();
  if (!canAccessBrowserExtension) {
    return;
  }

  const { githubUrgentPrefix, plainUrgentPrefix } =
    getPreferenceValues<Preferences.CopyFormattedUrgentLink>();

  await copyActiveLink({
    githubPrefix: githubUrgentPrefix,
    plainPrefix: plainUrgentPrefix,
  });
}
