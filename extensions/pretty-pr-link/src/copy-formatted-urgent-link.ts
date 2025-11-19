import { getPreferenceValues } from "@raycast/api";
import { copyActiveGithubLink } from "./utils/copy-active-github-link";
import { ensureBrowserExtensionAccess } from "./utils/ensure-browser-extension-access";

export default async function main() {
  const canAccessBrowserExtension = await ensureBrowserExtensionAccess();
  if (!canAccessBrowserExtension) {
    return;
  }

  const { prefix } =
    await getPreferenceValues<Preferences.CopyFormattedUrgentLink>();
  await copyActiveGithubLink({ prefix });
}
