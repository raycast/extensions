import { List } from "@raycast/api";

export const EmptyView = (props: { title: string; description: string }) => {
  return <List.EmptyView {...props} />;
};
