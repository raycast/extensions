import { List } from "@raycast/api";

export const EmptyView = ({ title }: { title: string }) => (
  <List>
    <List.EmptyView icon={{ source: "forge-icon-64.png" }} title={title} />
  </List>
);
