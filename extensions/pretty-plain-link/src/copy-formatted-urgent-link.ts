import { getPreferenceValues } from "@raycast/api";
import { copyActivePlainLink } from "./utils/copy-active-plain-link";
import { ensureBrowserExtensionAccess } from "./utils/ensure-browser-extension-access";

export default async function main() {
  const canAccessBrowserExtension = await ensureBrowserExtensionAccess();
  if (!canAccessBrowserExtension) {
    return;
  }

  const { urgentPrefix } =
    await getPreferenceValues<Preferences.CopyFormattedUrgentLink>();
  await copyActivePlainLink({ prefix: urgentPrefix });
}
