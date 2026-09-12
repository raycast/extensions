import { List } from "@raycast/api";

interface EmptyViewProps {
  title: string;
}

export function EmptyView({ title }: EmptyViewProps) {
  return (
    <List.EmptyView
      title={title}
      icon={{ source: { light: "empty-view.png", dark: "empty-view@dark.png" } }}
    ></List.EmptyView>
  );
}
