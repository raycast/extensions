import {
	Action,
	ActionPanel,
	Alert,
	Color,
	confirmAlert,
	Icon,
	showToast,
	Toast,
} from "@raycast/api";
import type { ReactNode } from "react";
import { runInTerminal } from "./terminal";

/**
 * One thing the reader can put right from the list.
 *
 * Every view answers Enter and Cmd+Enter, and they mean the same two things
 * everywhere: Enter resolves the row under the cursor, Cmd+Enter resolves
 * everything currently on screen. What "resolve" is differs per command —
 * killing a process, forgetting a network, deleting a dangling symlink,
 * opening the one settings pane that owns the setting — so each view builds
 * its own commands and this module only runs them.
 *
 * The command runs in Terminal rather than silently in the background. Three
 * reasons, all learned the hard way: several of these need administrator
 * rights and Touch ID has nowhere to prompt behind a Raycast view; a command
 * that fails should fail where the reader can read why; and an action that
 * deletes something should leave a record of what it did.
 */
export type Resolution = {
	/** The action's label. Says what happens, not what it is. */
	title: string;
	/** Shell command. Build it with shellQuote, never by concatenating input. */
	command: string;
	/** Shown in the confirmation, above the command. */
	detail?: string;
	/** Deletes, kills or disables something. Gets a red confirmation. */
	destructive?: boolean;
	/** How many things this touches. Only meaningful for the Cmd+Enter form. */
	count?: number;
};

/** Confirm, run in Terminal, say it started. */
export async function runResolution(r: Resolution): Promise<void> {
	const confirmed = await confirmAlert({
		title: r.title,
		message: r.detail ? `${r.detail}\n\n${r.command}` : r.command,
		icon: {
			source: r.destructive ? Icon.Trash : Icon.Hammer,
			tintColor: r.destructive ? Color.Red : Color.Orange,
		},
		primaryAction: {
			title: r.title,
			style: r.destructive
				? Alert.ActionStyle.Destructive
				: Alert.ActionStyle.Default,
		},
	});
	if (!confirmed) return;

	await runInTerminal(r.command);
	await showToast({
		style: Toast.Style.Success,
		title: r.title,
		message: "Running in Terminal",
	});
}

async function nothingToDo(what: string) {
	await showToast({
		style: Toast.Style.Failure,
		title: "Nothing to do here",
		message: what,
	});
}

/**
 * The two keystrokes, in the order every view puts them.
 *
 * Raycast binds Enter to the FIRST action in the panel, whatever shortcut that
 * action carries of its own. So the order here is not cosmetic: with `all`
 * rendered first, Enter on a row that has nothing of its own to resolve fired
 * the whole-screen action instead. On the git list that meant Enter on the
 * summary row pushing every clean repository; on the ports list, Enter on a
 * port with no process behind it quitting eighty-seven others.
 *
 * So `all` goes first only when `one` is there to hold the Enter slot. Without
 * it, everything else comes first and `all` sits at the end, still reachable by
 * its own Cmd+Enter, and Enter falls through to Run Again — which is the honest
 * answer for a row that is only information.
 */
export function ResolveActions({
	one,
	all,
	children,
}: {
	one?: Resolution;
	all?: Resolution;
	children?: ReactNode;
}) {
	const oneAction = one ? (
		<Action
			title={one.title}
			icon={{
				source: one.destructive ? Icon.Trash : Icon.Hammer,
				tintColor: one.destructive ? Color.Red : Color.Orange,
			}}
			onAction={() => runResolution(one)}
		/>
	) : null;

	const allAction = all ? (
		<Action
			title={all.title}
			icon={{ source: Icon.Hammer, tintColor: Color.Orange }}
			shortcut={{ modifiers: ["cmd"], key: "return" }}
			onAction={() =>
				all.count === 0
					? nothingToDo("Nothing on screen has an automatic fix.")
					: runResolution(all)
			}
		/>
	) : null;

	return one ? (
		<>
			{oneAction}
			{allAction}
			{children}
		</>
	) : (
		<>
			{children}
			{allAction}
		</>
	);
}

/**
 * One row's action panel: what it can resolve, then anything the view adds,
 * then the four every view shares.
 *
 * Enter is the first Action in the panel, so `one` being present is what makes
 * Enter act on the row. Where a row has nothing to resolve, Enter falls through
 * to Run Again, and the row is honest about it rather than offering a fix that
 * does nothing.
 */
export function RowActions({
	one,
	all,
	shared,
	children,
}: {
	one?: Resolution;
	all?: Resolution;
	shared?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<ActionPanel>
			<ResolveActions one={one} all={all}>
				{children}
				{shared}
			</ResolveActions>
		</ActionPanel>
	);
}
