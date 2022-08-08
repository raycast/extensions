import { Icon, List } from "@raycast/api";

export default function EmptyView({ title }: { title: string }) {
  return (
    <List>
      <List.EmptyView icon={Icon.Binoculars} title={title} />
    </List>
  );
}
