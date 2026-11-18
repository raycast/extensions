import { List } from "@raycast/api";

export function GitSubmodulesEmpty() {
  return <List.EmptyView title="There are no submodules in this repo" />;
}
