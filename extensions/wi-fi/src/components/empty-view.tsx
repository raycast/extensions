import { List } from "@raycast/api";

export function EmptyView(props: { title: string; description: string | undefined }) {
  const { title, description } = props;
  return <List.EmptyView title={title} description={description} icon={"empty-icon.svg"} />;
}
