import { List } from "@raycast/api";

interface EmptyViewProps {
  title: string;
  description?: string;
}

export function EmptyView({ title, description }: EmptyViewProps) {
  return (
    <List.EmptyView
      title={title}
      description={description}
      icon={{ source: { light: "empty-view.png", dark: "empty-view@dark.png" } }}
    ></List.EmptyView>
  );
}
