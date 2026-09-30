import { List } from "@raycast/api";

export const EmptyView = ({ title }: { title: string }) => {
  return <List.EmptyView title={title} icon="no-view.png" />;
};
