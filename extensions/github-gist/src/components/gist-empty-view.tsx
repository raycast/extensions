import { List } from "@raycast/api";

export function GistEmptyView(props: { title: string; description: string }) {
  const { title, description } = props;
  return <List.EmptyView title={title} description={description} />;
}
