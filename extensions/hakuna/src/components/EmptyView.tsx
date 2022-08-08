import { Icon, Image, List } from "@raycast/api";

export default function EmptyView({ title, icon = Icon.Binoculars }: { title: string; icon?: Image.ImageLike | null }) {
  return (
    <List>
      <List.EmptyView icon={icon} title={title} />
    </List>
  );
}
