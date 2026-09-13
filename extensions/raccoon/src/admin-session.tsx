import {
	Action,
	ActionPanel,
	Alert,
	confirmAlert,
	Detail,
	getPreferenceValues,
	Icon,
	openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
	currentUsername,
	install,
	isInstalled,
	SESSION_LABELS,
	SUDOERS_PATH,
	type SudoSession,
	uninstall,
} from "./sudoers";

function selectedSession(): SudoSession {
	const { sudoSession } = getPreferenceValues<Preferences.AdminSession>();
	return sudoSession === "-1" ? "-1" : "60";
}

export default function Command() {
	const session = selectedSession();
	const { data: installed, isLoading, revalidate } = usePromise(isInstalled);

	const enable = async () => {
		try {
			await install(session);
			revalidate();
		} catch (error) {
			await showFailureToast(error, {
				title: "Could not write the sudoers drop-in",
			});
		}
	};

	const disable = async () => {
		const confirmed = await confirmAlert({
			title: "Go back to asking every time?",
			message: `Removes ${SUDOERS_PATH}. Every privileged Raccoon command will ask for Touch ID again.`,
			primaryAction: {
				title: "Remove",
				style: Alert.ActionStyle.Destructive,
			},
		});
		if (!confirmed) return;
		try {
			await uninstall();
			revalidate();
		} catch (error) {
			await showFailureToast(error, {
				title: "Could not remove the sudoers drop-in",
			});
		}
	};

	const markdown = [
		"# Admin session",
		"",
		"`audit`, `upgrade`, `apps` and `fleet` need administrator rights. macOS ties a sudo",
		"authentication to the process tree when there is no terminal, and Raycast starts a fresh",
		"process for every command - so by default each one asks for Touch ID again.",
		"",
		installed
			? `**On.** One authentication covers every Raccoon command (${SESSION_LABELS[session]}).`
			: "**Off.** Every privileged command asks for Touch ID separately.",
		"",
		"## What gets installed",
		"",
		"```",
		`${SUDOERS_PATH}`,
		"",
		`Defaults:${currentUsername()} timestamp_type=global`,
		`Defaults:${currentUsername()} timestamp_timeout=${session}`,
		"```",
		"",
		"The file is checked with `visudo -c` before it is installed, and only the final copy runs",
		"as root. Change the duration in the extension preferences, then apply it again.",
		"",
		"> This relaxes sudo for **every** process you own, not only Raccoon, for the duration above.",
		`> Undo it here, or with \`sudo rm ${SUDOERS_PATH}\`.`,
	].join("\n");

	return (
		<Detail
			isLoading={isLoading}
			markdown={markdown}
			actions={
				<ActionPanel>
					{installed ? (
						<Action
							title="Ask Every Time Again"
							icon={Icon.Trash}
							onAction={disable}
						/>
					) : (
						<Action
							title="Ask Only Once"
							icon={Icon.Fingerprint}
							onAction={enable}
						/>
					)}
					{installed && (
						<Action
							title="Apply Current Duration"
							icon={Icon.ArrowClockwise}
							onAction={enable}
						/>
					)}
					<Action
						title="Change Duration"
						icon={Icon.Gear}
						onAction={openExtensionPreferences}
					/>
				</ActionPanel>
			}
		/>
	);
}
