import { Icon, List } from "@raycast/api";

interface EmptyViewProps {
  title?: string;
  description?: string;
  icon?: Icon;
}

export function EmptyView({
  title = "No Results",
  description = "No items found",
  icon = Icon.MagnifyingGlass,
}: EmptyViewProps) {
  return <List.EmptyView title={title} description={description} icon={icon} />;
}