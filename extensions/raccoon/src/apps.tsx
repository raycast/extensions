import { Icon } from "@raycast/api";
import { DryRunFirst } from "./dry-run-first";

/**
 * `rcc apps` — the GUI applications, updated through four channels: Homebrew
 * casks, the App Store via `mas`, a catalog of apps that update themselves,
 * and Sparkle feeds. Opens in `--dry-run`; DryRunFirst says why.
 */
export default function Command() {
	return (
		<DryRunFirst
			command="apps"
			subject="Apps"
			unit="update channels"
			idleIcon={Icon.AppWindowGrid3x3}
			confirm={{
				title: "Update every app that has a new version?",
				message:
					"Raccoon will download and install updates through Homebrew, the " +
					"App Store and Sparkle. Applications that are open may be replaced " +
					"or asked to restart.",
				action: "Update Apps",
			}}
		/>
	);
}
