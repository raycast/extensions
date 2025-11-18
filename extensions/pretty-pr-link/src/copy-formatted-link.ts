import { getPreferenceValues } from "@raycast/api";
import { copyActiveGithubLink } from "./utils/copy-active-github-link";
import { ensureBrowserExtensionAccess } from "./utils/ensure-browser-extension-access";

export default async function main() {
  await ensureBrowserExtensionAccess();
  const { prefix } = await getPreferenceValues<Preferences.CopyFormattedLink>();
  await copyActiveGithubLink({ prefix });
}
