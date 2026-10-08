import { Color, Icon, List } from "@raycast/api";
import { EmptyView } from "./empty-view";

export function ErrorView() {
  return (
    <List>
      <EmptyView
        title="Failed to load data"
        description="Please check credentials and try again"
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
      ></EmptyView>
    </List>
  );
}
