import { Color, Icon, List } from "@raycast/api";
import { emptyTrash, reveal } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import { parseTrash } from "./simple-json";

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
			navigationTitle={(t) => (t ? `Trash — ${t.size}` : "Trash")}
			searchBarPlaceholder="Search trash details"
			emptyIcon={Icon.Trash}
			emptyTitle="Nothing in the trash"
		>
			{(t, actions) => {
				// Emptying is the only thing anyone does here, so it is what
				// Enter does from any of the three rows, and Cmd+Enter is the
				// same act: there is one trash, not a screen of them.
				const empty =
					t.count > 0
						? {
								title: "Empty the Trash",
								command: emptyTrash(),
								detail: `${t.count} ${t.count === 1 ? "item" : "items"}, ${t.size}`,
								destructive: true,
								count: t.count,
							}
						: undefined;
				const rowActions = (
					<RowActions one={empty} all={empty} shared={actions} />
				);
				return [
					<List.Item
						key="size"
						icon={{
							source: Icon.Trash,
							tintColor: weight(t.count),
						}}
						title="Size"
						accessories={[
							{ tag: { value: t.size, color: weight(t.count) } },
						]}
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
				];
			}}
		</RccList>
	);
}
