import { Color, Icon, List } from "@raycast/api";
import {
	bootoutAgents,
	openSettings,
	removeLoginItems,
	SETTINGS,
} from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { loadNow, parseStartup, type StartupReport } from "./startup-json";

/** Busy relative to nothing in particular, but 4 and 8 are where a Mac feels it. */
function loadTint(load: string): Color {
	const now = loadNow(load);
	if (now === null) return Color.SecondaryText;
	if (now < 4) return Color.Green;
	if (now < 8) return Color.Orange;
	return Color.Red;
}

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
	const allAgents =
		s.user_agents.length > 0
			? {
					title: `Stop ${s.user_agents.length} Launch Agents`,
					command: bootoutAgents(s.user_agents),
					detail: "Stops them for this login session. They load again at next login unless their plist is removed.",
					destructive: true,
					count: s.user_agents.length,
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
	return (
		<>
			{/* What a person installed, and can remove. */}
			<List.Section
				title="Login items"
				subtitle={`${s.login_items.length}`}
			>
				{s.login_items.map((item) => (
					<List.Item
						key={`login-${item}`}
						icon={{ source: Icon.Person, tintColor: Color.Green }}
						title={item}
						accessories={[{ tag: { value: "opens at login" } }]}
						actions={
							<RowActions
								one={{
									title: "Stop It Opening at Login",
									command: removeLoginItems([item]),
									detail: `Removes ${item} from Login Items. The app itself is untouched.`,
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
				{s.user_agents.map((agent) => (
					<List.Item
						key={`agent-${agent}`}
						icon={{ source: Icon.Gear, tintColor: Color.Green }}
						title={agent}
						subtitle="~/Library/LaunchAgents"
						actions={
							<RowActions
								one={{
									title: "Stop This Agent",
									command: bootoutAgents([agent]),
									detail: `Unloads ${agent} for this login session. Its plist stays, so it loads again at next login.`,
									destructive: true,
								}}
								all={allAgents}
								shared={actions}
							/>
						}
					/>
				))}
			</List.Section>
			{/* What the system runs, which is context rather than a to-do list. */}
			<List.Section title="System">
				<List.Item
					icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
					title="System launch agents"
					accessories={[{ text: String(s.counts.system_agents) }]}
					actions={systemRow}
				/>
				<List.Item
					icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
					title="Launch daemons"
					accessories={[{ text: String(s.counts.daemons) }]}
					actions={systemRow}
				/>
				<List.Item
					icon={{ source: Icon.Bolt, tintColor: Color.SecondaryText }}
					title="Running services"
					accessories={[{ text: String(s.counts.running_services) }]}
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
					? `Startup — ${s.login_items.length + s.user_agents.length} things this Mac starts`
					: "Startup"
			}
			searchBarPlaceholder="Search login items and launch agents"
			emptyIcon={Icon.Power}
			emptyTitle="Nothing starts on its own"
		>
			{(s, actions) => <Rows s={s} actions={actions} />}
		</RccList>
	);
}
