import { Icon, Image, List } from "@raycast/api";

export default function EmptyView({
  title,
  icon = Icon.Binoculars,
  isLoading = false,
}: {
  title: string;
  icon?: Image.ImageLike | null;
  isLoading?: boolean;
}) {
  return (
    <List isLoading={isLoading}>
      <List.EmptyView icon={icon} title={title} />
    </List>
  );
}
