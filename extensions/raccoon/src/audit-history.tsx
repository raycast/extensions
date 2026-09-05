import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { HISTORY_DIR, readHistory, type PastAudit } from "./audit-runs";
import { join } from "node:path";

/**
 * `rcc audit history` — the audits already run on this machine.
 *
 * A list, because the question here is comparative: not "what is wrong now"
 * (the Audit screen answers that) but "is it getting better or worse". So every
 * run is a row, newest first, with the counts where an eye can run down them.
 *
 * Nothing is executed to build this. rcc keeps each run as JSON, so the screen
 * reads the folder — which is why it opens instantly, and why it shows the
 * whole archive rather than the ten that `--history` prints.
 */

function when(run: PastAudit): string {
	if (!run.at) return run.stamp;
	return run.at.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

/**
 * The colour of a run, taken from its worst finding: a failure is red however
 * many checks passed beside it, because the failure is what you came to see.
 */
function tint(run: PastAudit): Color {
	if (run.fail > 0) return Color.Red;
	if (run.warning > 0) return Color.Yellow;
	return Color.Green;
}

export default function Command() {
	const { data, isLoading, revalidate } = usePromise(readHistory);
	const runs = data ?? [];

	const refresh = (
		<Action
			title="Refresh"
			icon={Icon.ArrowClockwise}
			shortcut={Keyboard.Shortcut.Common.Refresh}
			onAction={revalidate}
		/>
	);

	return (
		<List
			isLoading={isLoading}
			navigationTitle={
				runs.length > 0
					? `Audit History — ${runs.length} runs`
					: "Audit History"
			}
			searchBarPlaceholder="Search past audits"
		>
			<List.EmptyView
				icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
				title="No audit has been run on this Mac yet"
				description="Run Security Audit once and it will be kept here."
				actions={<ActionPanel>{refresh}</ActionPanel>}
			/>
			{runs.map((run) => (
				<List.Item
					key={run.file}
					icon={{ source: Icon.Shield, tintColor: tint(run) }}
					title={when(run)}
					subtitle={run.deep ? "deep" : undefined}
					accessories={[
						// Only what this run actually found. Three counts where two
						// are zero reads as three findings at a glance.
						...(run.fail > 0
							? [
									{
										tag: {
											value: `${run.fail} failed`,
											color: Color.Red,
										},
									},
								]
							: []),
						...(run.warning > 0
							? [
									{
										tag: {
											value: `${run.warning} warnings`,
											color: Color.Yellow,
										},
									},
								]
							: []),
						{ text: `${run.pass} passed` },
					]}
					actions={
						<ActionPanel>
							<Action.ShowInFinder
								title="Show Saved Run in Finder"
								path={join(HISTORY_DIR, run.file)}
							/>
							<Action.CopyToClipboard
								title="Copy Timestamp"
								content={run.stamp}
								shortcut={Keyboard.Shortcut.Common.Copy}
							/>
							{refresh}
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}
