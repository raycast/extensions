import { List, Icon, Color } from "@raycast/api";

interface ErrorViewProps {
  icon: { source: Icon; tintColor: Color };
  title: string;
  description: string;
}

export function ErrorView({ icon, title, description }: ErrorViewProps): JSX.Element {
  return (
    <List>
      <List.EmptyView icon={icon} title={title} description={description} />
    </List>
  );
}
