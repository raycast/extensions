import { Action, Color, Icon, List } from "@raycast/api";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseHistory, used, type HistoryReport } from "./history-json";

function Rows({ h, actions }: { h: HistoryReport; actions: React.ReactNode }) {
	// Nothing here is broken, so nothing here gets fixed. What a person wants
	// from a list of commands they already ran is the command back: Enter puts
	// one on the clipboard, Cmd+Enter puts the whole visible list there.
	const shells: Array<[string, number]> = [
		["zsh", h.counts.zsh],
		["bash", h.counts.bash],
		["fish", h.counts.fish],
	];
	return (
		<>
			<List.Section
				title="Commands recorded"
				subtitle={`${h.counts.total}`}
			>
				{shells.map(([name, count]) => (
					<List.Item
						key={name}
						icon={{
							source: Icon.Terminal,
							// A shell with no history is one you do not use: grey, not zero
							// dressed up as a result.
							tintColor: used(count)
								? Color.Green
								: Color.SecondaryText,
						}}
						title={name}
						accessories={[
							{
								tag: {
									value: String(count),
									color: used(count)
										? Color.Green
										: Color.SecondaryText,
								},
							},
						]}
						actions={<RowActions shared={actions} />}
					/>
				))}
			</List.Section>
			<List.Section title="Recent" subtitle={`${h.recent.length}`}>
				{h.recent.map((cmd, i) => (
					<List.Item
						key={`${cmd}-${i}`}
						icon={{
							source: Icon.ChevronRight,
							tintColor: Color.SecondaryText,
						}}
						title={cmd}
						actions={
							<RowActions shared={actions}>
								<Action.CopyToClipboard
									title="Copy This Command"
									content={cmd}
								/>
								<Action.CopyToClipboard
									title={`Copy All ${h.recent.length} Commands`}
									content={h.recent.join("\n")}
									shortcut={{
										modifiers: ["cmd"],
										key: "return",
									}}
								/>
							</RowActions>
						}
					/>
				))}
			</List.Section>
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="history"
			parse={parseHistory}
			navigationTitle={(h) =>
				h
					? `Shell history — ${h.counts.total} commands`
					: "Shell history"
			}
			searchBarPlaceholder="Search shells and recent commands"
			emptyIcon={Icon.Terminal}
			emptyTitle="No shell history"
		>
			{(h, actions) => <Rows h={h} actions={actions} />}
		</RccList>
	);
}
