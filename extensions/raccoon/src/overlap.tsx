import { Action, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { whichAll } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import {
	byClash,
	clashLevel,
	groupByName,
	parseOverlap,
	type NameGroup,
} from "./simple-json";

const TINT = {
	single: Color.SecondaryText,
	double: Color.Orange,
	worse: Color.Red,
} as const;

const ICON = {
	single: Icon.Terminal,
	double: Icon.Duplicate,
	worse: Icon.ExclamationMark,
} as const;

function Rows({
	groups,
	actions,
}: {
	groups: NameGroup[];
	actions: React.ReactNode;
}) {
	// Worst first: three copies of a name is the reason to open this screen.
	const sorted = useMemo(() => [...groups].sort(byClash), [groups]);
	return (
		<>
			{sorted.map((group) => {
				const level = clashLevel(group);
				const winner = group.entries[0];
				return (
					<List.Item
						key={group.name}
						icon={{ source: ICON[level], tintColor: TINT[level] }}
						title={group.name}
						// The copy that actually runs, decided by PATH order.
						subtitle={winner.path}
						keywords={group.entries.flatMap((e) => [
							e.manager,
							e.path,
						])}
						accessories={[
							// One tag per manager, on one row, rather than one row per
							// copy: the point is that the same name has several owners.
							...group.managers.map((manager) => ({
								tag: { value: manager, color: TINT[level] },
							})),
							...(group.entries.length > group.managers.length
								? [{ text: `${group.entries.length} copies` }]
								: []),
						]}
						actions={
							<RowActions
								one={{
									title: "Show Every Place It Resolves From",
									command: whichAll(group.name),
									detail: "In PATH order. The first line is the one that runs.",
								}}
								shared={actions}
							>
								<Action.CopyToClipboard
									title="Copy Winning Path"
									content={winner.path}
								/>
							</RowActions>
						}
					/>
				);
			})}
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="overlap"
			parse={(stdout) => groupByName(parseOverlap(stdout))}
			navigationTitle={(g) => {
				if (!g) return "PATH";
				const clashing = g.filter((x) => x.entries.length > 1).length;
				return `PATH — ${g.length} names, ${clashing} from more than one place`;
			}}
			searchBarPlaceholder="Search by name, manager or path"
			emptyIcon={Icon.Terminal}
			emptyTitle="Nothing on the PATH"
		>
			{(groups, actions) => <Rows groups={groups} actions={actions} />}
		</RccList>
	);
}
