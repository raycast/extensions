import { List, Icon, Color } from "@raycast/api";

function EmptyView() {
  return <List.EmptyView icon={{ source: Icon.Folder, tintColor: Color.Red }} title="No Tasks" />;
}

export default EmptyView;
