import { Action, Alert, Color, Icon, confirmAlert } from "@raycast/api";
import { useState } from "react";
import { ProgressList } from "./progress-list";

/**
 * `rcc apps` — the GUI applications, updated through four channels: Homebrew
 * casks, the App Store via `mas`, a catalog of apps that update themselves,
 * and Sparkle feeds.
 *
 * It opens in `--dry-run`, and that is the design decision worth stating.
 * Unlike every other screen here, this command *changes the machine*: it
 * downloads and installs new versions of applications the reader is very
 * possibly using at that moment. A screen that starts by doing that, because
 * someone pressed Enter on a row in a launcher, has taken a decision away from
 * them.
 *
 * So the first run answers "what would change", which is the question you have
 * before deciding — and updating for real is a separate, confirmed action.
 */
export default function Command() {
	const [live, setLive] = useState(false);

	const updateForReal = async () => {
		const confirmed = await confirmAlert({
			title: "Update every app that has a new version?",
			message:
				"Raccoon will download and install updates through Homebrew, the " +
				"App Store and Sparkle. Applications that are open may be replaced " +
				"or asked to restart.",
			primaryAction: {
				title: "Update Apps",
				style: Alert.ActionStyle.Destructive,
			},
		});
		if (!confirmed) return;
		setLive(true);
	};

	return (
		<ProgressList
			args={live ? ["apps"] : ["apps", "--dry-run"]}
			title={live ? "Updating Apps" : "Apps — what would change"}
			unit="update channels"
			idleIcon={Icon.AppWindowGrid3x3}
			extraActions={
				live ? null : (
					<Action
						title="Update Apps for Real"
						icon={{ source: Icon.Download, tintColor: Color.Red }}
						onAction={updateForReal}
					/>
				)
			}
		/>
	);
}
