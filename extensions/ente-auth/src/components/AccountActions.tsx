import {
	Action,
	ActionPanel,
	Icon,
	Keyboard,
	LaunchType,
	Toast,
	confirmAlert,
	launchCommand,
	showToast,
} from "@raycast/api";
import { safeMessage } from "../cloud/errors";
import { TOTPState } from "../cloud/model";
import { removeImportedEntries } from "../helpers/removeImportedEntries";

interface AccountActionsProps {
	state: TOTPState;
	onRefresh: () => Promise<void> | undefined;
	onSignOut: (mode?: "cloud" | "import") => Promise<void> | undefined;
	onRemoveImportedEntries: () => Promise<void> | undefined;
}

export function AccountActions({
	state,
	onRefresh,
	onSignOut,
	onRemoveImportedEntries,
}: AccountActionsProps) {
	const cloud = state.mode === "cloud";
	const canSync = cloud && state.hasSession;
	const needsRetry =
		state.entries.length === 0 && (state.status === "Offline" || state.status === "Sync failed");

	async function signOut() {
		try {
			await onSignOut();
		} catch (error) {
			await showToast({ style: Toast.Style.Failure, title: "Sign-out failed", message: safeMessage(error) });
		}
	}

	async function useImportedEntries() {
		const confirmed = await confirmAlert({
			title: "Use import mode?",
			message:
				"This signs out of cloud mode and removes its saved keys and cache. Imported entries and export files are kept.",
			primaryAction: { title: "Use Import Mode" },
		});
		if (!confirmed) {
			return;
		}

		try {
			await onSignOut("import");
			await launchCommand({ name: "index", type: LaunchType.UserInitiated });
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Mode change failed",
				message: safeMessage(error),
			});
		}
	}

	return (
		<ActionPanel.Section title="Account">
			{canSync && (
				<Action
					title={needsRetry ? "Retry" : "Sync Now"}
					icon={Icon.ArrowClockwise}
					shortcut={Keyboard.Shortcut.Common.Refresh}
					onAction={onRefresh}
				/>
			)}
			{(!cloud || !state.hasSession) && (
				<Action
					title="Sign In to Ente"
					icon={Icon.Person}
					onAction={() => launchCommand({ name: "sign-in", type: LaunchType.UserInitiated })}
				/>
			)}
			{!cloud && <Action title="Reload Imported Entries" icon={Icon.ArrowClockwise} onAction={onRefresh} />}
			{cloud && state.hasImportedEntries && (
				<Action
					title="Remove Imported Entries"
					icon={Icon.Trash}
					style={Action.Style.Destructive}
					onAction={() => removeImportedEntries(onRemoveImportedEntries)}
				/>
			)}
			{canSync && (
				<Action
					title="Sign Out of Ente"
					icon={Icon.Logout}
					style={Action.Style.Destructive}
					onAction={signOut}
				/>
			)}
			{cloud && <Action title="Use Imported Entries" icon={Icon.Document} onAction={useImportedEntries} />}
		</ActionPanel.Section>
	);
}
