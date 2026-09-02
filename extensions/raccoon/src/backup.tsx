import { Color, Icon, List } from "@raycast/api";
import { openSettings, reveal, SETTINGS, startBackup } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import {
	health,
	humanAge,
	parseBackup,
	type BackupHealth,
	type BackupReport,
} from "./backup-json";

const TINT: Record<BackupHealth, Color> = {
	never: Color.Red,
	fresh: Color.Green,
	late: Color.Orange,
	overdue: Color.Red,
};

const HEADLINE: Record<BackupHealth, string> = {
	never: "This Mac has never been backed up",
	fresh: "Backed up",
	late: "Backup is a few days old",
	overdue: "Backup is more than a week old",
};

function Rows({ b, actions }: { b: BackupReport; actions: React.ReactNode }) {
	const state = health(b);
	// A Mac with no destination cannot be told to back up; the destination has
	// to be chosen first, and only System Settings can do that. With one
	// configured, starting a backup now is the whole resolution — there is one
	// backup, so Enter and Cmd+Enter are the same act.
	const fix = b.destination.configured
		? {
				title: b.running ? "Open Time Machine Settings" : "Back Up Now",
				command: b.running
					? openSettings(SETTINGS.timeMachine)
					: startBackup(),
				detail: b.running
					? undefined
					: `Writes to ${b.destination.name || "the configured destination"}.`,
				count: 1,
			}
		: {
				title: "Choose a Destination",
				command: openSettings(SETTINGS.timeMachine),
				detail: "Time Machine has nowhere to write until a disk is chosen.",
				count: 1,
			};
	const row = <RowActions one={fix} all={fix} shared={actions} />;
	return (
		<>
			{/* The answer, as one row, before any of the detail under it. */}
			<List.Section title="Backup">
				<List.Item
					icon={{
						source:
							state === "fresh"
								? Icon.CheckCircle
								: Icon.ExclamationMark,
						tintColor: TINT[state],
					}}
					title={HEADLINE[state]}
					subtitle={b.last_backup.date || undefined}
					accessories={[
						{
							tag: {
								value: humanAge(b.last_backup.hours_ago),
								color: TINT[state],
							},
						},
					]}
					actions={row}
				/>
			</List.Section>

			<List.Section title="Destination">
				<List.Item
					icon={{
						source: b.destination.configured
							? Icon.HardDrive
							: Icon.XMarkCircle,
						tintColor: b.destination.configured
							? Color.Green
							: Color.Red,
					}}
					title={
						b.destination.configured
							? b.destination.name || "Configured"
							: "No destination configured"
					}
					subtitle={
						b.destination.configured
							? b.destination.kind || undefined
							: "Time Machine has nowhere to write"
					}
					actions={row}
				/>
				<List.Item
					icon={{
						source: b.running ? Icon.CircleProgress50 : Icon.Pause,
						tintColor: b.running
							? Color.Orange
							: Color.SecondaryText,
					}}
					title="Status"
					accessories={[
						{
							tag: {
								value: b.running ? "backing up now" : "idle",
								color: b.running
									? Color.Orange
									: Color.SecondaryText,
							},
						},
					]}
					actions={row}
				/>
			</List.Section>

			{b.exclusions.length > 0 ? (
				<List.Section
					title="Excluded from backup"
					subtitle={`${b.exclusions.length}`}
				>
					{b.exclusions.map((path) => (
						<List.Item
							key={path}
							icon={{
								source: Icon.Minus,
								tintColor: Color.SecondaryText,
							}}
							title={path}
							actions={
								<RowActions
									one={{
										title: "Show It in Finder",
										command: reveal(path),
									}}
									all={fix}
									shared={actions}
								/>
							}
						/>
					))}
				</List.Section>
			) : null}
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="backup"
			parse={parseBackup}
			navigationTitle={(b) =>
				b
					? `Time Machine — ${HEADLINE[health(b)].toLowerCase()}`
					: "Time Machine"
			}
			searchBarPlaceholder="Search backup details"
			emptyIcon={Icon.HardDrive}
			emptyTitle="No Time Machine information"
		>
			{(b, actions) => <Rows b={b} actions={actions} />}
		</RccList>
	);
}
