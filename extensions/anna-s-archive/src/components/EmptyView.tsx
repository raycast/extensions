import { Icon, List } from "@raycast/api";

interface EmptyViewProps {
  title: string;
}

export function EmptyView({ title }: EmptyViewProps) {
  return <List.EmptyView title={title} icon={{ source: Icon.Book }}></List.EmptyView>;
}
