import { Action, Alert, Color, Icon, confirmAlert } from "@raycast/api";
import { useState } from "react";
import { ProgressList } from "./progress-list";

/**
 * The screen for an rcc command that changes the machine.
 *
 * `apps` and `upgrade` are the two: one replaces applications the reader may
 * be using at that moment, the other rewrites what every package manager has
 * installed. A screen that starts by doing that, because someone pressed Enter
 * on a row in a launcher, has taken a decision away from them.
 *
 * So the first run is `--dry-run` and answers "what would change", which is
 * the question you have before deciding — and doing it for real is a separate,
 * confirmed action. It is the one rule every screen here keeps: opening a
 * screen does not act.
 */
export function DryRunFirst({
	command,
	subject,
	unit,
	idleIcon,
	confirm,
}: {
	/** The rcc subcommand, e.g. "apps". */
	command: string;
	/** What the screen is about, for its titles: "Apps", "Packages". */
	subject: string;
	/** What the rows are, for the search placeholder. */
	unit: string;
	idleIcon: Icon;
	/** The confirmation shown before the real run. */
	confirm: { title: string; message: string; action: string };
}) {
	const [live, setLive] = useState(false);

	const runForReal = async () => {
		const confirmed = await confirmAlert({
			title: confirm.title,
			message: confirm.message,
			primaryAction: {
				title: confirm.action,
				style: Alert.ActionStyle.Destructive,
			},
		});
		if (!confirmed) return;
		setLive(true);
	};

	return (
		<ProgressList
			args={live ? [command] : [command, "--dry-run"]}
			title={
				live ? `Updating ${subject}` : `${subject} — what would change`
			}
			unit={unit}
			idleIcon={idleIcon}
			extraActions={
				live ? null : (
					<Action
						title={`${confirm.action} for Real`}
						icon={{ source: Icon.Download, tintColor: Color.Red }}
						onAction={runForReal}
					/>
				)
			}
		/>
	);
}
