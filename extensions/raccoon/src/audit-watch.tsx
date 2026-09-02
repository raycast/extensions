import {
	Action,
	ActionPanel,
	Alert,
	Color,
	Icon,
	Keyboard,
	List,
	Toast,
	confirmAlert,
	showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runRcc } from "./rcc";

/**
 * `rcc audit watch` — a scheduled audit, as something you can see and change.
 *
 * The command takes no argument and installs a weekly job: run it and a launchd
 * agent appears, with no screen before and nothing to say after. As a row in a
 * launcher that is a trapdoor — a command that quietly changes what the machine
 * does on Sundays.
 *
 * The CLI already knows more than that one command exposes: `audit schedule`
 * takes daily, weekly or monthly, reports its own status, and can remove
 * itself. So this shows the state first and offers the three real choices, each
 * behind a confirmation, with the installed one marked. Opening the screen runs
 * `schedule status`, which only looks.
 */

type Frequency = "daily" | "weekly" | "monthly";

const WHEN: Record<Frequency, string> = {
	daily: "Every day at 9:00",
	weekly: "Sundays at 9:00",
	monthly: "The 1st of each month at 9:00",
};

/** rcc answers `Active — weekly` or `No active schedule.` */
async function readSchedule(): Promise<Frequency | undefined> {
	const status = await runRcc(["audit", "schedule", "status"]);
	const match = /active\s*[—-]\s*(daily|weekly|monthly)/i.exec(status);
	return match ? (match[1].toLowerCase() as Frequency) : undefined;
}

export default function Command() {
	const { data: active, isLoading, revalidate } = usePromise(readSchedule);

	const schedule = async (frequency: Frequency) => {
		const confirmed = await confirmAlert({
			title: `Run a deep audit ${frequency}?`,
			message:
				"Raccoon installs a launchd agent that runs `rcc audit --deep` " +
				`${WHEN[frequency].toLowerCase()}, whether or not you are at the ` +
				"Mac. It stays until you remove it.",
			primaryAction: { title: "Schedule It" },
		});
		if (!confirmed) return;
		await runRcc(["audit", "schedule", frequency]);
		await showToast({
			style: Toast.Style.Success,
			title: `Audit scheduled ${frequency}`,
			message: WHEN[frequency],
		});
		revalidate();
	};

	const remove = async () => {
		const confirmed = await confirmAlert({
			title: "Stop the scheduled audit?",
			message:
				"The launchd agent is removed. Nothing already kept in the audit " +
				"history is deleted.",
			primaryAction: {
				title: "Remove Schedule",
				style: Alert.ActionStyle.Destructive,
			},
		});
		if (!confirmed) return;
		await runRcc(["audit", "schedule", "remove"]);
		await showToast({
			style: Toast.Style.Success,
			title: "Scheduled audit removed",
		});
		revalidate();
	};

	const stop = active ? (
		<Action
			title="Remove the Schedule"
			icon={{ source: Icon.Trash, tintColor: Color.Red }}
			onAction={remove}
		/>
	) : null;

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
				active ? `Scheduled Audit — ${active}` : "Scheduled Audit"
			}
			searchBarPlaceholder="Search frequencies"
		>
			<List.Section
				title={active ? `Running ${active}` : "Not scheduled"}
				subtitle={active ? WHEN[active] : "No audit runs on its own"}
			>
				{(Object.keys(WHEN) as Frequency[]).map((frequency) => {
					const isActive = frequency === active;
					return (
						<List.Item
							key={frequency}
							icon={{
								source: isActive
									? Icon.CheckCircle
									: Icon.Circle,
								tintColor: isActive
									? Color.Green
									: Color.SecondaryText,
							}}
							title={frequency}
							subtitle={WHEN[frequency]}
							accessories={isActive ? [{ text: "Active" }] : []}
							actions={
								<ActionPanel>
									{isActive ? (
										stop
									) : (
										<Action
											title={`Run the Audit ${frequency}`}
											icon={Icon.Alarm}
											onAction={() => schedule(frequency)}
										/>
									)}
									{isActive ? null : stop}
									{refresh}
								</ActionPanel>
							}
						/>
					);
				})}
			</List.Section>
		</List>
	);
}
