import { List, Icon } from "@raycast/api";

interface ErrorViewProps {
  error: string;
  title?: string;
  icon?: Icon;
}

export function ErrorView({ error, title = "Error", icon = Icon.ExclamationMark }: ErrorViewProps) {
  return (
    <List>
      <List.EmptyView icon={icon} title={title} description={error} />
    </List>
  );
}
