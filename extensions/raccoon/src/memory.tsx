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
	megabytes,
	parseMemory,
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

	const processes: MemoryProcess[] = data ?? [];
	const totalMb = processes.reduce((sum, p) => sum + megabytes(p.rss), 0);

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
								`${displayName(p.command)} (${megabytes(p.rss)} MB)`,
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
								detail: `pid ${process.pid}, holding ${megabytes(process.rss)} MB. Unsaved work in it is lost.`,
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
				processes.length > 0
					? `Memory — ${processes.length} processes, ${totalMb} MB`
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
			{processes.map((process) => {
				const w = weight(process.rss);
				return (
					<List.Item
						key={process.pid}
						icon={{ source: ICON[w], tintColor: TINT[w] }}
						title={displayName(process.command)}
						subtitle={`PID ${process.pid}`}
						accessories={[
							{
								tag: {
									value: `${megabytes(process.rss)} MB`,
									color: TINT[w],
								},
							},
						]}
						actions={actions(process)}
					/>
				);
			})}
		</List>
	);
}
