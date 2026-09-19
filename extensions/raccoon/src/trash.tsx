import { Color, Icon, List } from "@raycast/api";
import { emptyTrash, reveal } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseTrash } from "./simple-json";
import { trashDetail, trashTotal, volumeName } from "./trash-detail";

/** A trash worth emptying, one worth noting, or one that is already empty. */
function weight(count: number): Color {
	if (count === 0) return Color.SecondaryText;
	if (count < 50) return Color.Green;
	return Color.Orange;
}

export default function Command() {
	return (
		<RccList
			command="trash"
			parse={parseTrash}
			navigationTitle={(t) => (t ? `Trash: ${t.size}` : "Trash")}
			searchBarPlaceholder="Search trash details"
			emptyIcon={Icon.Trash}
			emptyTitle="Nothing in the trash"
		>
			{(t, actions) => {
				// Emptying is the only thing anyone does here, so it is what
				// Enter does from any of the three rows, and Cmd+Enter is the
				// same act: there is one trash, not a screen of them.
				// Every mounted volume's trash goes with it, because Finder is what
				// empties it - so the count and the sentence come from the whole
				// report, not from the home trash alone.
				const total = trashTotal(t);
				const empty =
					total > 0
						? {
								title: "Empty the Trash",
								command: emptyTrash(),
								detail: trashDetail(t),
								destructive: true,
								count: total,
							}
						: undefined;
				const rowActions = <RowActions one={empty} all={empty} shared={actions} />;
				return [
					<List.Item
						key="size"
						icon={{
							source: Icon.Trash,
							tintColor: weight(t.count),
						}}
						title="Size"
						accessories={[{ tag: { value: t.size, color: weight(t.count) } }]}
						actions={rowActions}
					/>,
					<List.Item
						key="count"
						icon={{
							source: Icon.Document,
							tintColor: weight(t.count),
						}}
						title="Items"
						accessories={[
							{
								tag: {
									value: String(t.count),
									color: weight(t.count),
								},
							},
						]}
						actions={rowActions}
					/>,
					<List.Item
						key="path"
						icon={{
							source: Icon.Folder,
							tintColor: Color.SecondaryText,
						}}
						title="Location"
						subtitle={t.path}
						actions={
							<RowActions
								one={{
									title: "Show the Trash in Finder",
									command: reveal(t.path),
								}}
								all={empty}
								shared={actions}
							/>
						}
					/>,
					// A mounted volume keeps its own trash, and emptying the
					// trash empties that one too. Listed rather than only
					// counted in the confirmation, so the reader sees which
					// drive the items are on before they agree to it.
					...t.volumes.map((v) => (
						<List.Item
							key={v.path}
							icon={{ source: Icon.HardDrive, tintColor: weight(v.count) }}
							title={volumeName(v.path)}
							subtitle={`${v.count} ${v.count === 1 ? "item" : "items"}`}
							keywords={[v.path]}
							accessories={[{ tag: { value: v.size, color: weight(v.count) } }]}
							actions={
								<RowActions
									one={{ title: "Show This Trash in Finder", command: reveal(v.path) }}
									all={empty}
									shared={actions}
								/>
							}
						/>
					)),
				];
			}}
		</RccList>
	);
}
