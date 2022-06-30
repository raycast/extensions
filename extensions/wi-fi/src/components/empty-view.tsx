import { List } from "@raycast/api";

export function EmptyView(props: { title: string }) {
  const { title } = props;
  return <List.EmptyView title={title} icon={"empty-icon.svg"} />;
}
