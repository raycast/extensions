import { getPreferenceValues } from "@raycast/api";
import { copyActivePlainLink } from "./utils/copy-active-plain-link";
import { ensureBrowserExtensionAccess } from "./utils/ensure-browser-extension-access";

export default async function main() {
	const canAccessBrowserExtension = await ensureBrowserExtensionAccess();
	if (!canAccessBrowserExtension) {
		return;
	}

	const { nonUrgentPrefix } =
		await getPreferenceValues<Preferences.CopyFormattedLink>();
	await copyActivePlainLink({ prefix: nonUrgentPrefix });
}
