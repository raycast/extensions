import { List } from "@raycast/api";

export function EmptyView(props: { title: string; icon: string; description: string }) {
  const { title, icon, description } = props;
  return <List.EmptyView title={title} icon={icon} description={description} />;
}
