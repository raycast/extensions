import { ActionPanel, List } from "@raycast/api";
import CreateItemAction from "./CreateItemAction";
import { Item } from "../types";

function EmptyView(props: { items: Item[]; searchText: string; onCreate: (title: string, detail: string) => void }) {
  if (props.searchText.length > 0) {
    return (
      <List.EmptyView
        icon="💥"
        title="No matching items found"
        description={`Can't find a items matching <${props.searchText}>.\nCreate it now!`}
        actions={
          <ActionPanel>
            <CreateItemAction defaultTitle={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.EmptyView
        icon="📝"
        title="No items found"
        description="You don't have any item yet. Why not add some?"
        actions={
          <ActionPanel>
            <CreateItemAction defaultTitle={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  }
}
export default EmptyView;
