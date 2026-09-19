import {
	Action,
	ActionPanel,
	Detail,
	environment,
	Icon,
	launchCommand,
	LaunchType,
	openExtensionPreferences,
	showToast,
	Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { installOutcome } from "./install-outcome.ts";
import { useRef, useState } from "react";
import { INSTALL_COMMAND, resolveRcc, streamInstall } from "./rcc";

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
	const running = useRef(false);
	const controllerRef = useRef<AbortController | undefined>(undefined);

	const install = async () => {
		// A ref, not the isInstalling state: two presses of Enter land in the
		// same render, so both would read `false` and start their own brew,
		// interleaving two logs into one buffer and launching the command
		// twice when they both finish.
		if (running.current) return;
		running.current = true;
		setIsInstalling(true);
		setLog("");
		const controller = new AbortController();
		controllerRef.current = controller;
		try {
			const exit = await streamInstall((chunk) => setLog((previous) => previous + chunk.text), controller.signal);
			// brew failing is the ordinary outcome worth reporting - no
			// Homebrew, no tap, no network - and it used to end with the same
			// screen and no word said, indistinguishable from success.
			const outcome = installOutcome(exit, INSTALL_COMMAND);
			if (!outcome.installed) {
				await showToast({
					style: Toast.Style.Failure,
					title: outcome.stopped ? "Installation stopped" : "Homebrew could not install rcc",
					message: outcome.stopped
						? "Homebrew may have left a partly installed formula behind. Pressing Install again picks it up."
						: outcome.why,
				});
				return;
			}
			// brew said yes, but this screen is shown because rcc was not found:
			// what settles it is looking again, on the same paths the extension
			// searches.
			try {
				resolveRcc();
			} catch {
				await showToast({
					style: Toast.Style.Failure,
					title: "Installed, but rcc is still not where Raccoon looks",
					message: "Set the path to the binary in the extension preferences.",
				});
				return;
			}
			await showToast({
				style: Toast.Style.Success,
				title: "rcc installed",
			});
			// Discovery runs when a command starts, so the command has to start
			// again. Relaunching this one covers every screen that shows this
			// one, without each of them having to know about installing.
			//
			// On its own, because a relaunch that fails is not an install that
			// failed: rcc is on the machine either way, and saying otherwise
			// would send the reader to fix something that is already right.
			try {
				await launchCommand({
					name: environment.commandName,
					type: LaunchType.UserInitiated,
				});
			} catch (error) {
				await showFailureToast(error, {
					title: "rcc is installed. Reopen the command to use it.",
				});
			}
		} catch (error) {
			await showFailureToast(error, {
				title: "Could not run the Homebrew install",
			});
		} finally {
			running.current = false;
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
					{/* Stop only aborts: `running` and `isInstalling` are cleared where
					    they already are, in install()'s finally. Clearing them here
					    would let a second Install start inside spawnTree's three
					    second grace window, with two brews on the same Cellar. */}
					{isInstalling ? (
						<Action
							title="Stop the Installation"
							icon={Icon.Stop}
							onAction={() => controllerRef.current?.abort()}
						/>
					) : (
						<Action title="Install with Homebrew" icon={Icon.Download} onAction={install} />
					)}
					<Action title="Set Raccoon CLI Path" icon={Icon.Gear} onAction={openExtensionPreferences} />
					<Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
					<Action.OpenInBrowser title="Open Raccoon on GitHub" url={REPO_URL} />
				</ActionPanel>
			}
		/>
	);
}
