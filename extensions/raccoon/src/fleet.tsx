import {
	Action,
	ActionPanel,
	Color,
	Icon,
	Keyboard,
	List,
	confirmAlert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { FLEET_CONF, readGroups, readHosts, type Host } from "./fleet-hosts";
import { RccDetail } from "./rcc-detail";
import type { RccCommand } from "./commands";

/**
 * `rcc fleet` — the other Macs, and the one screen here that refuses to run its
 * command when you open it.
 *
 * Every other view runs rcc the moment it appears, because every other command
 * only looks at this machine. `fleet` reaches out over SSH to a list of real
 * computers: it authenticates, copies its audit script across, and runs it
 * there. Opening a row in a launcher is not consent to any of that, and a view
 * that connected on sight would make the launcher itself dangerous to browse.
 *
 * So this reads `fleet.conf` — a text file, no network — and shows what is
 * configured. Scanning is a separate action that says how many machines it is
 * about to contact before it contacts them.
 */

function subtitle(host: Host): string {
	const parts: string[] = [];
	if (host.port) parts.push(`port ${host.port}`);
	if (host.profile) parts.push(`profile ${host.profile}`);
	return parts.join(" · ");
}

/**
 * A command for RccDetail to stream. Built here rather than looked up:
 * `findCommand` takes an id from the generated list, and `fleet audit --host
 * one-machine` is not on it.
 */
function scanCommand(args: string[], what: string): RccCommand {
	return {
		id: args.join("-"),
		args,
		title: `Auditing ${what}`,
		description: `rcc ${args.join(" ")}`,
		needsRoot: false,
	};
}

export default function Command() {
	const [scan, setScan] = useState<RccCommand | undefined>();
	const { data, isLoading, revalidate } = usePromise(async () => ({
		hosts: await readHosts(),
		groups: await readGroups(),
	}));

	// Once the reader has said yes, this becomes the streaming view for the run
	// they asked for. Nothing reaches it before that.
	if (scan) return <RccDetail command={scan} />;

	const hosts = data?.hosts ?? [];
	const groups = data?.groups ?? new Map<string, string[]>();

	const confirmScan = async (args: string[], what: string) => {
		const confirmed = await confirmAlert({
			title: `Audit ${what} over SSH?`,
			message:
				"Raccoon opens an SSH connection to each machine, copies its audit " +
				"script across and runs it there. Machines that are asleep or " +
				"unreachable hold the run up until they time out.",
			primaryAction: { title: "Start the Scan" },
		});
		if (confirmed) setScan(scanCommand(args, what));
	};

	const refresh = (
		<Action
			title="Refresh"
			icon={Icon.ArrowClockwise}
			shortcut={Keyboard.Shortcut.Common.Refresh}
			onAction={revalidate}
		/>
	);

	const scanAll =
		hosts.length > 0 ? (
			<Action
				title={`Audit All ${hosts.length} Machines`}
				icon={{ source: Icon.Monitor, tintColor: Color.Orange }}
				onAction={() =>
					confirmScan(
						["fleet", "audit"],
						`all ${hosts.length} configured machines`,
					)
				}
			/>
		) : null;

	return (
		<List
			isLoading={isLoading}
			navigationTitle={
				hosts.length > 0 ? `Fleet — ${hosts.length} machines` : "Fleet"
			}
			searchBarPlaceholder="Search configured machines"
		>
			<List.EmptyView
				icon={{ source: Icon.Monitor, tintColor: Color.SecondaryText }}
				title="No machines configured"
				description={`Add one with \`rcc fleet add <host>\`. Raccoon keeps them in ${FLEET_CONF}.`}
				actions={<ActionPanel>{refresh}</ActionPanel>}
			/>

			{groups.size > 0 ? (
				<List.Section title="Groups" subtitle="Audit a set at a time">
					{[...groups].map(([name, members]) => (
						<List.Item
							key={`group-${name}`}
							icon={{
								source: Icon.Layers,
								tintColor: Color.Blue,
							}}
							title={name}
							subtitle={members.join(", ")}
							accessories={[
								{
									text: `${members.length} ${
										members.length === 1
											? "machine"
											: "machines"
									}`,
								},
							]}
							actions={
								<ActionPanel>
									<Action
										title={`Audit the ${name} Group`}
										icon={{
											source: Icon.Layers,
											tintColor: Color.Orange,
										}}
										onAction={() =>
											confirmScan(
												[
													"fleet",
													"audit",
													"--group",
													name,
												],
												`the ${members.length} machines in ${name}`,
											)
										}
									/>
									{scanAll}
									{refresh}
								</ActionPanel>
							}
						/>
					))}
				</List.Section>
			) : null}

			<List.Section
				title="Machines"
				subtitle={
					hosts.length > 0 ? "Nothing has been contacted" : undefined
				}
			>
				{hosts.map((host) => (
					<List.Item
						key={host.line}
						// Grey, deliberately. This screen knows the machine is
						// configured and nothing more; a green dot would be a claim
						// about a machine nobody has spoken to.
						icon={{
							source: Icon.Monitor,
							tintColor: Color.SecondaryText,
						}}
						title={host.name}
						subtitle={subtitle(host)}
						actions={
							<ActionPanel>
								<Action
									title={`Audit ${host.name}`}
									icon={{
										source: Icon.Monitor,
										tintColor: Color.Orange,
									}}
									onAction={() =>
										confirmScan(
											[
												"fleet",
												"audit",
												"--host",
												host.name,
											],
											host.name,
										)
									}
								/>
								{scanAll}
								<Action.CopyToClipboard
									title="Copy Hostname"
									content={host.name}
									shortcut={Keyboard.Shortcut.Common.Copy}
								/>
								<Action.ShowInFinder
									title="Show Fleet Config in Finder"
									path={FLEET_CONF}
								/>
								{refresh}
							</ActionPanel>
						}
					/>
				))}
			</List.Section>
		</List>
	);
}
