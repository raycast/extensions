import {
	Action,
	ActionPanel,
	Color,
	Icon,
	Keyboard,
	List,
	openExtensionPreferences,
} from "@raycast/api";
import type { ReactNode } from "react";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import { RccNotFoundError } from "./rcc";
import { useRccStream } from "./use-rcc-stream";
import { withoutProgress } from "./markdown";
import {
	managersFrom,
	stillWorking,
	type Manager,
	type ManagerState,
} from "./upgrade-progress";

/**
 * The screen for a long rcc action that narrates itself.
 *
 * `upgrade` and `apps` are the two: both walk a list of things in turn — brew,
 * pip, npm for one; casks, mas, catalog, sparkle for the other — and report
 * every step as `<name>: <state>`. Both rendered as one block of text that
 * grew for minutes, where everything was present and nothing was findable:
 * which one is working, which are finished, which are not installed at all.
 *
 * One list, because the unit of these commands is the thing being updated, and
 * the reader's question throughout is "where is it up to". What each one
 * printed stays with it, in its own pane, instead of scrolling past.
 */

const LOOK: Record<ManagerState, { icon: Icon; tint: Color; label: string }> = {
	updating: {
		icon: Icon.ArrowClockwise,
		tint: Color.Blue,
		label: "Updating",
	},
	checking: {
		icon: Icon.MagnifyingGlass,
		tint: Color.Blue,
		label: "Checking",
	},
	previewed: { icon: Icon.Eye, tint: Color.SecondaryText, label: "Dry run" },
	done: { icon: Icon.CheckCircle, tint: Color.Green, label: "Up to date" },
	// Neither a failure nor a warning: something you have not installed is not
	// a problem to solve, so it must not be dressed as one.
	absent: {
		icon: Icon.Minus,
		tint: Color.SecondaryText,
		label: "Not installed",
	},
	unknown: { icon: Icon.Circle, tint: Color.SecondaryText, label: "" },
};

function Row({ manager, actions }: { manager: Manager; actions: ReactNode }) {
	const look = LOOK[manager.state];
	return (
		<List.Item
			icon={{ source: look.icon, tintColor: look.tint }}
			title={manager.name}
			subtitle={manager.detail}
			accessories={look.label ? [{ text: look.label }] : []}
			detail={
				<List.Item.Detail
					markdown={
						manager.log
							? ["```", manager.log, "```"].join("\n")
							: `\`${manager.name}\` has printed nothing yet.`
					}
				/>
			}
			actions={
				<ActionPanel>
					{manager.log ? (
						<Action.CopyToClipboard
							title={`Copy ${manager.name} Output`}
							content={manager.log}
							shortcut={Keyboard.Shortcut.Common.Copy}
						/>
					) : null}
					{actions}
				</ActionPanel>
			}
		/>
	);
}

export function ProgressList({
	args,
	title,
	unit,
	idleIcon,
	extraActions,
}: {
	/** Argv for rcc, e.g. ["apps", "--dry-run"]. */
	args: string[];
	/** Navigation title while nothing is running. */
	title: string;
	/** What the rows are, for the search placeholder. */
	unit: string;
	idleIcon: Icon;
	/** Actions this particular command adds, e.g. running it for real. */
	extraActions?: ReactNode;
}) {
	const { output, stderrOutput, exit, isLoading, error, reload, stop } =
		useRccStream(args);

	if (error instanceof RccNotFoundError) return <MissingRcc />;

	const rows = managersFrom(output);
	const working = isLoading && stillWorking(rows);
	const done = rows.filter((r) => r.state === "done").length;
	const command = `rcc ${args.join(" ")}`;

	const shared = (
		<>
			{extraActions}
			{isLoading ? (
				<Action title="Stop" icon={Icon.Stop} onAction={stop} />
			) : (
				<Action
					title="Run Again"
					icon={Icon.ArrowClockwise}
					shortcut={Keyboard.Shortcut.Common.Refresh}
					onAction={reload}
				/>
			)}
			<Action.CopyToClipboard
				title="Copy Whole Run"
				content={withoutProgress(output)}
				shortcut={Keyboard.Shortcut.Common.CopyName}
			/>
			<Action
				title="Set Rcc Path"
				icon={Icon.Gear}
				onAction={openExtensionPreferences}
			/>
			<Action.OpenInBrowser
				title="Open Raccoon on GitHub"
				url={REPO_URL}
			/>
		</>
	);

	// Before the first marker there is nothing to group yet, and a run that
	// could not start explains itself on stderr rather than in any row.
	const emptyTitle = isLoading
		? `Starting ${command}`
		: error
			? `${command} could not be run`
			: `${command} printed nothing`;

	return (
		<List
			isLoading={isLoading}
			isShowingDetail={rows.length > 0}
			navigationTitle={
				working ? `${title} — ${done} of ${rows.length} done` : title
			}
			searchBarPlaceholder={`Search ${unit}`}
		>
			<List.EmptyView
				icon={{
					source: error ? Icon.XMarkCircle : idleIcon,
					tintColor: error ? Color.Red : Color.SecondaryText,
				}}
				title={emptyTitle}
				description={error?.message ?? stderrOutput.trim() ?? undefined}
				actions={<ActionPanel>{shared}</ActionPanel>}
			/>
			{rows.map((row) => (
				<Row key={row.name} manager={row} actions={shared} />
			))}
			{exit && exit.code !== 0 && !isLoading ? (
				<List.Item
					icon={{ source: Icon.Warning, tintColor: Color.Orange }}
					title="Finished with errors"
					subtitle={`${command} exited with status ${exit.code}`}
					detail={
						<List.Item.Detail
							markdown={
								stderrOutput.trim()
									? ["```", stderrOutput.trim(), "```"].join(
											"\n",
										)
									: "Nothing was written to stderr."
							}
						/>
					}
					actions={<ActionPanel>{shared}</ActionPanel>}
				/>
			) : null}
		</List>
	);
}
