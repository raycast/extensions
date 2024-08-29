import { Icon, List } from "@raycast/api";
import { EmptyView } from "./empty-view";

export function ErrorView() {
  return (
    <List>
      <EmptyView title="Failed to load data" icon={Icon.Warning}></EmptyView>
    </List>
  );
}
