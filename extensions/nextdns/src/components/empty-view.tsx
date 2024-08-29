import { ActionPanel, Icon, ImageLike, List } from "@raycast/api";

export function EmptyView(props: { title: string; icon: Icon | ImageLike }) {
  const { title, icon } = props;

  return <List.EmptyView title={title} icon={icon} actions={<ActionPanel></ActionPanel>} />;
}
