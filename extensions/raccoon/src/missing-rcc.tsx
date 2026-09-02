import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { INSTALL_COMMAND, streamInstall } from "./rcc";

export const REPO_URL = "https://github.com/thousandflowers/Raccoon";

/**
 * First run without the CLI: install it from here rather than sending the user
 * to a terminal.
 *
 * Lives in its own file because every screen that runs rcc has to be able to
 * show it, and two copies of an install screen are two install screens that
 * drift.
 */
export function MissingRcc() {
	const [log, setLog] = useState("");
	const [isInstalling, setIsInstalling] = useState(false);

	const install = async () => {
		setIsInstalling(true);
		setLog("");
		try {
			await streamInstall((chunk) =>
				setLog((previous) => previous + chunk.text),
			);
		} finally {
			setIsInstalling(false);
		}
	};

	const markdown = [
		"# Raccoon CLI not found",
		"",
		"This extension runs the `rcc` command-line tool.",
		"",
		"Press **Install with Homebrew** below, or set the path in preferences if it is already installed elsewhere.",
		"",
		log ? ["## Installing", "", "```", log, "```"].join("\n") : "",
	].join("\n");

	return (
		<Detail
			isLoading={isInstalling}
			markdown={markdown}
			actions={
				<ActionPanel>
					<Action
						title="Install with Homebrew"
						icon={Icon.Download}
						onAction={install}
					/>
					<Action
						title="Set Rcc Path"
						icon={Icon.Gear}
						onAction={openExtensionPreferences}
					/>
					<Action.CopyToClipboard
						title="Copy Install Command"
						content={INSTALL_COMMAND}
					/>
					<Action.OpenInBrowser
						title="Open Raccoon on GitHub"
						url={REPO_URL}
					/>
				</ActionPanel>
			}
		/>
	);
}
