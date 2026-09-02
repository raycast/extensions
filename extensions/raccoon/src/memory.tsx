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
import { killPids } from "./fixes";
import { ResolveActions } from "./resolve";
import { findCommand } from "./commands";
import {
	type MemoryProcess,
	type Weight,
	displayName,
	gigabytes,
	megabytes,
	parseMemory,
	pressure,
	weight,
} from "./memory-json";
import { MissingRcc, REPO_URL } from "./missing-rcc";
import { RccDetail } from "./rcc-detail";
import { RccNotFoundError, resolveRcc, RUNTIME_PATH } from "./rcc";

const TINT: Record<Weight, Color> = {
	light: Color.Green,
	heavy: Color.Orange,
	huge: Color.Red,
};

const ICON: Record<Weight, Icon> = {
	light: Icon.Circle,
	heavy: Icon.CircleProgress50,
	huge: Icon.CircleProgress100,
};

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
		["memory", "--json"],
		{
			execute: rccPath !== null,
			env: { ...process.env, NO_COLOR: "1", PATH: RUNTIME_PATH },
			timeout: JSON_TIMEOUT_MS,
			parseOutput: readJson("memory", parseMemory),
		},
	);

	if (resolveError instanceof RccNotFoundError) return <MissingRcc />;

	const processes: MemoryProcess[] = data?.processes ?? [];
	const machine = data?.memory ?? null;

	// Quitting is the resolution here: the list exists because something is
	// holding memory. `kill` and not `kill -9` — a process that is asked to
	// quit saves its work first, and one that ignores the ask is a separate
	// problem the reader should see rather than have papered over.
	const quitAll =
		processes.length > 0
			? {
					title: `Quit ${processes.length} Processes`,
					command: killPids(processes.map((p) => p.pid)),
					detail: processes
						.map(
							(p) =>
								`${displayName(p.command)} (${megabytes(p.footprint_kb)} MB)`,
						)
						.join("\n"),
					destructive: true,
					count: processes.length,
				}
			: undefined;

	const actions = (process: MemoryProcess | null) => (
		<ActionPanel>
			<ResolveActions
				one={
					process
						? {
								title: `Quit ${displayName(process.command)}`,
								command: killPids([process.pid]),
								detail: `pid ${process.pid}, holding ${megabytes(process.footprint_kb)} MB. Unsaved work in it is lost.`,
								destructive: true,
							}
						: undefined
				}
				all={quitAll}
			>
				{process ? (
					<>
						<Action.CopyToClipboard
							title="Copy Process Name"
							content={displayName(process.command)}
							shortcut={Keyboard.Shortcut.Common.Copy}
						/>
						<Action.CopyToClipboard
							title="Copy Full Path"
							content={process.command}
						/>
						<Action.CopyToClipboard
							title="Copy PID"
							content={String(process.pid)}
						/>
					</>
				) : null}
				<Action
					title="Run Again"
					icon={Icon.ArrowClockwise}
					shortcut={Keyboard.Shortcut.Common.Refresh}
					onAction={revalidate}
				/>
				{/* The table on request, not by default. */}
				<Action
					title="Show Raw Output"
					icon={Icon.Text}
					shortcut={{ modifiers: ["cmd"], key: "t" }}
					onAction={() =>
						push(<RccDetail command={findCommand("memory")} />)
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
					title="The memory report could not be read"
					description={error.message}
					actions={actions(null)}
				/>
			</List>
		);
	}

	return (
		<List
			isLoading={isLoading}
			navigationTitle={
				machine
					? `Memory — ${gigabytes(machine.used_mb)} of ${gigabytes(machine.total_mb)} GB in use`
					: processes.length > 0
						? `Memory — ${processes.length} processes`
						: "Memory"
			}
			searchBarPlaceholder="Search processes by name"
		>
			<List.EmptyView
				icon={{
					source: Icon.MemoryChip,
					tintColor: Color.SecondaryText,
				}}
				title={isLoading ? "Reading memory" : "No processes reported"}
				actions={actions(null)}
			/>
			{/* Whether the machine is short, before which process to blame:
			    swap in use means it already ran out once. */}
			{machine ? (
				<List.Section title="This Mac">
					<List.Item
						key="pressure"
						icon={{
							source: ICON[pressure(machine)],
							tintColor: TINT[pressure(machine)],
						}}
						title="In use"
						subtitle={`wired ${gigabytes(machine.wired_mb)}, active ${gigabytes(machine.active_mb)}, compressed ${gigabytes(machine.compressed_mb)} GB`}
						accessories={[
							{
								tag: {
									value: `${gigabytes(machine.used_mb)} of ${gigabytes(machine.total_mb)} GB`,
									color: TINT[pressure(machine)],
								},
							},
						]}
						actions={actions(null)}
					/>
					<List.Item
						key="swap"
						icon={{
							source: Icon.HardDrive,
							tintColor:
								machine.swap_used_mb > 0
									? Color.Orange
									: Color.SecondaryText,
						}}
						title="Swap"
						subtitle={
							machine.swap_used_mb > 0
								? "Memory has already spilled to disk"
								: "Nothing on disk"
						}
						accessories={[
							{
								text: `${gigabytes(machine.swap_used_mb)} of ${gigabytes(machine.swap_total_mb)} GB`,
							},
						]}
						actions={actions(null)}
					/>
				</List.Section>
			) : null}
			<List.Section
				title="By footprint"
				subtitle="what each process costs, compressed pages included"
			>
				{processes.map((process) => {
					const w = weight(process.footprint_kb);
					return (
						<List.Item
							key={process.pid}
							icon={{ source: ICON[w], tintColor: TINT[w] }}
							title={displayName(process.command)}
							subtitle={`PID ${process.pid}`}
							accessories={[
								...(process.rss_kb !== process.footprint_kb
									? [
											{
												text: `${megabytes(process.rss_kb)} MB resident`,
											},
										]
									: []),
								{
									tag: {
										value: `${megabytes(process.footprint_kb)} MB`,
										color: TINT[w],
									},
								},
							]}
							actions={actions(process)}
						/>
					);
				})}
			</List.Section>
		</List>
	);
}
