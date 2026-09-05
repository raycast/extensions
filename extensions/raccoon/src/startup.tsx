import { Color, Icon, List } from "@raycast/api";
import {
	bootoutAgents,
	openSettings,
	removeLoginItems,
	SETTINGS,
} from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import {
	loadNow,
	parseStartup,
	type StartupReport,
	type UserAgent,
} from "./startup-json";

/** Busy relative to nothing in particular, but 4 and 8 are where a Mac feels it. */
function loadTint(load: string): Color {
	const now = loadNow(load);
	if (now === null) return Color.SecondaryText;
	if (now < 4) return Color.Green;
	if (now < 8) return Color.Orange;
	return Color.Red;
}

/** What is true of an agent's plist, in a word. */
function agentState(a: UserAgent): { value: string; color: Color } | null {
	if (a.loaded) return null;
	if (a.loaded_from) return { value: "shadowed", color: Color.Orange };
	return { value: "not loaded", color: Color.SecondaryText };
}

/** Only a loaded agent with a real label can be stopped; the rest are not running. */
const stoppable = (a: UserAgent) => a.loaded && a.label !== "";

function Rows({ s, actions }: { s: StartupReport; actions: React.ReactNode }) {
	// Two kinds of thing start on their own and they are removed differently: a
	// login item is an entry System Events owns, an agent is a job launchd
	// loads. The bulk form of each is offered only from its own section, so
	// Cmd+Enter never reaches across into the other kind.
	const allLoginItems =
		s.login_items.length > 0
			? {
					title: `Stop ${s.login_items.length} Login Items`,
					command: removeLoginItems(s.login_items),
					detail: s.login_items.join(", "),
					destructive: true,
					count: s.login_items.length,
				}
			: undefined;
	const running = s.user_agents.filter(stoppable);
	const allAgents =
		running.length > 0
			? {
					title: `Stop ${running.length} Launch Agents`,
					command: bootoutAgents(running.map((a) => a.label)),
					detail: "Stops them for this login session. They load again at next login unless their plist is removed.",
					destructive: true,
					count: running.length,
				}
			: undefined;
	// Nothing in the System section is the reader's to switch off from a list,
	// so Enter there opens the pane that owns the whole question instead.
	const systemRow = (
		<RowActions
			one={{
				title: "Open Login Items Settings",
				command: openSettings(SETTINGS.loginItems),
			}}
			shared={actions}
		/>
	);
	const missing = new Set(s.login_items_missing);
	return (
		<>
			{/* What a person installed, and can remove. */}
			<List.Section
				title="Login items"
				subtitle={
					s.login_items_error
						? "not checked"
						: `${s.login_items.length}`
				}
			>
				{s.login_items_error ? (
					<List.Item
						key="login-error"
						icon={{ source: Icon.Warning, tintColor: Color.Orange }}
						title="Login items could not be read"
						subtitle={s.login_items_error}
						accessories={[{ tag: { value: "not checked" } }]}
						actions={systemRow}
					/>
				) : null}
				{s.login_items.map((item) => (
					<List.Item
						key={`login-${item}`}
						icon={{
							source: Icon.Person,
							tintColor: missing.has(item)
								? Color.Orange
								: Color.Green,
						}}
						title={item}
						accessories={[
							missing.has(item)
								? {
										tag: {
											value: "target is gone",
											color: Color.Orange,
										},
									}
								: { tag: { value: "opens at login" } },
						]}
						actions={
							<RowActions
								one={{
									title: missing.has(item)
										? "Remove the Dead Entry"
										: "Stop It Opening at Login",
									command: removeLoginItems([item]),
									detail: missing.has(item)
										? `${item} points at something that no longer exists, so nothing opens. This removes the entry.`
										: `Removes ${item} from Login Items. The app itself is untouched.`,
									destructive: true,
								}}
								all={allLoginItems}
								shared={actions}
							/>
						}
					/>
				))}
			</List.Section>
			<List.Section
				title="Your launch agents"
				subtitle={`${s.user_agents.length}`}
			>
				{s.user_agents.map((agent) => {
					const state = agentState(agent);
					return (
						<List.Item
							key={`agent-${agent.file || agent.name}`}
							icon={{
								source: Icon.Gear,
								tintColor: agent.loaded
									? Color.Green
									: Color.SecondaryText,
							}}
							title={agent.name}
							subtitle={agent.file || "~/Library/LaunchAgents"}
							keywords={[agent.label]}
							accessories={state ? [{ tag: state }] : []}
							actions={
								<RowActions
									one={
										stoppable(agent)
											? {
													title: "Stop This Agent",
													command: bootoutAgents([
														agent.label,
													]),
													detail: `Unloads ${agent.label} for this login session. Its plist stays, so it loads again at next login.`,
													destructive: true,
												}
											: undefined
									}
									all={allAgents}
									shared={actions}
								/>
							}
						/>
					);
				})}
			</List.Section>
			{/* Registered by apps through System Settings, not by a plist the
			    reader put anywhere: the pane that owns them is the fix. */}
			<List.Section
				title="Background items registered by apps"
				subtitle={`${s.background_items.length}`}
			>
				{s.background_items.map((item) => (
					<List.Item
						key={`bg-${item.label}`}
						icon={{
							source: Icon.Gear,
							tintColor:
								item.pid !== null
									? Color.Green
									: Color.SecondaryText,
						}}
						title={item.label}
						accessories={[
							item.pid !== null
								? { tag: { value: `running, pid ${item.pid}` } }
								: { tag: { value: "loaded" } },
						]}
						actions={systemRow}
					/>
				))}
			</List.Section>
			{/* What the system runs, which is context rather than a to-do list. */}
			<List.Section title="System">
				<List.Item
					icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
					title="/Library/LaunchAgents"
					accessories={[
						{
							text:
								s.counts.system_agents_loaded === null
									? String(s.counts.system_agents)
									: `${s.counts.system_agents_loaded} loaded of ${s.counts.system_agents}`,
						},
					]}
					actions={systemRow}
				/>
				<List.Item
					icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
					title="/Library/LaunchDaemons"
					accessories={[{ text: String(s.counts.daemons) }]}
					actions={systemRow}
				/>
				<List.Item
					icon={{ source: Icon.Bolt, tintColor: Color.SecondaryText }}
					title="Services with a process right now"
					accessories={[
						{
							text:
								s.counts.loaded_services === null
									? String(s.counts.running_services)
									: `${s.counts.running_services} of ${s.counts.loaded_services} loaded`,
						},
					]}
					actions={systemRow}
				/>
				<List.Item
					icon={{
						source: Icon.Clock,
						tintColor: Color.SecondaryText,
					}}
					title="Uptime"
					accessories={[{ text: s.uptime || "Unknown" }]}
					actions={systemRow}
				/>
				<List.Item
					icon={{
						source: Icon.LineChart,
						tintColor: loadTint(s.load),
					}}
					title="Load average"
					accessories={[
						{
							tag: {
								value: s.load || "Unknown",
								color: loadTint(s.load),
							},
						},
					]}
					actions={systemRow}
				/>
			</List.Section>
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="startup"
			parse={parseStartup}
			navigationTitle={(s) =>
				s
					? `Startup — ${s.login_items.length + s.user_agents.length + s.background_items.length} things this Mac starts`
					: "Startup"
			}
			searchBarPlaceholder="Search login items, launch agents and background items"
			emptyIcon={Icon.Power}
			emptyTitle="Nothing starts on its own"
		>
			{(s, actions) => <Rows s={s} actions={actions} />}
		</RccList>
	);
}
