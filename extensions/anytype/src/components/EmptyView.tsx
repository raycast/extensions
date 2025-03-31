import { List } from "@raycast/api";

export default function EmptyView({ title }: { title: string }) {
  return <List.EmptyView title={title} />;
}
