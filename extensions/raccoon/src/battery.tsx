import {
	Action,
	ActionPanel,
	Color,
	Icon,
	Keyboard,
	List,
	openExtensionPreferences,
	useNavigation,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { JSON_TIMEOUT_MS, readJson } from "./json-out.ts";
import {
	type BatteryReport,
	type Health,
	capacityHealth,
	chargeHealth,
	chargingLabel,
	conditionHealth,
	cycleHealth,
	parseBattery,
} from "./battery-json";
import { openSettings, SETTINGS } from "./fixes";
import { ResolveActions } from "./resolve";
import { findCommand } from "./commands";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import { RccDetail } from "./rcc-detail";
import { RccNotFoundError, resolveRcc, RUNTIME_PATH } from "./rcc";

/** The only three colours, plus the absence of one. Nothing decorative. */
const TINT: Record<Health, Color> = {
	good: Color.Green,
	fair: Color.Orange,
	poor: Color.Red,
	neutral: Color.SecondaryText,
};

type Row = {
	id: string;
	title: string;
	value: string;
	icon: Icon;
	health: Health;
};

/**
 * The report as rows.
 *
 * A row per measurement rather than the CLI's table: the table is one block a
 * reader has to scan, and the point of a list is that the colour finds the bad
 * line for them. The raw table is still one keystroke away for anyone who
 * wants it.
 */
function rows(b: BatteryReport): Row[] {
	if (!b.present) {
		return [
			{
				id: "present",
				title: "No battery",
				value: "This Mac runs on AC power only",
				icon: Icon.Plug,
				health: "neutral",
			},
		];
	}
	const pct = (n: number | null) => (n === null ? "Unknown" : `${n}%`);
	return [
		{
			id: "charge",
			title: "Charge level",
			value: pct(b.charge_percent),
			icon: Icon.BatteryCharging,
			health: chargeHealth(b.charge_percent),
		},
		{
			id: "capacity",
			title: "Maximum capacity",
			value: pct(b.max_capacity_percent),
			icon: Icon.Heartbeat,
			health: capacityHealth(b.max_capacity_percent),
		},
		{
			id: "cycles",
			title: "Cycle count",
			value: b.cycle_count === null ? "Unknown" : String(b.cycle_count),
			icon: Icon.ArrowClockwise,
			health: cycleHealth(b.cycle_count),
		},
		{
			id: "condition",
			title: "Condition",
			value: b.condition ?? "Unknown",
			icon: Icon.Stars,
			health: conditionHealth(b.condition),
		},
		{
			id: "charging",
			title: "Charging",
			value: chargingLabel(b),
			icon:
				b.charging || b.power_source === "ac"
					? Icon.Bolt
					: Icon.BoltDisabled,
			health: "neutral",
		},
	];
}

export default function Command() {
	const { push } = useNavigation();

	let rccPath: string | null = null;
	let resolveError: unknown;
	try {
		rccPath = resolveRcc();
	} catch (error) {
		resolveError = error;
	}

	const { isLoading, data, error, revalidate } = useExec(
		rccPath ?? "rcc",
		["battery", "--json"],
		{
			execute: rccPath !== null,
			env: { ...process.env, NO_COLOR: "1", PATH: RUNTIME_PATH },
			timeout: JSON_TIMEOUT_MS,
			parseOutput: readJson("battery", parseBattery),
		},
	);

	if (resolveError instanceof RccNotFoundError) return <MissingRcc />;

	// A battery is a reading, not a setting: nothing here is put right by a
	// command, and a cycle count is not a thing to fix. What is actually
	// adjustable — charge limit, low power mode, what wakes the Mac — all lives
	// in one pane, so both keystrokes open it rather than pretend otherwise.
	const settings = {
		title: "Open Battery Settings",
		command: openSettings(SETTINGS.battery),
		detail: "Charge limit, low power mode and wake behaviour are set here.",
		count: 1,
	};

	const actions = (
		<ActionPanel>
			<ResolveActions one={settings} all={settings}>
				<Action
					title="Run Again"
					icon={Icon.ArrowClockwise}
					shortcut={Keyboard.Shortcut.Common.Refresh}
					onAction={revalidate}
				/>
				{/* The table is the exception, not the default: it exists for the
			    reader who wants the output rcc actually printed. */}
				<Action
					title="Show Raw Output"
					icon={Icon.Text}
					shortcut={{ modifiers: ["cmd"], key: "t" }}
					onAction={() =>
						push(<RccDetail command={findCommand("battery")} />)
					}
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
			</ResolveActions>
		</ActionPanel>
	);

	if (error) {
		return (
			<List>
				<List.EmptyView
					icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
					title="The battery report could not be read"
					description={error.message}
					actions={actions}
				/>
			</List>
		);
	}

	return (
		<List
			isLoading={isLoading}
			navigationTitle="Battery"
			searchBarPlaceholder="Search battery details"
		>
			{(data ? rows(data) : []).map((row) => (
				<List.Item
					key={row.id}
					icon={{ source: row.icon, tintColor: TINT[row.health] }}
					title={row.title}
					accessories={[
						{
							tag: { value: row.value, color: TINT[row.health] },
						},
					]}
					actions={actions}
				/>
			))}
		</List>
	);
}
