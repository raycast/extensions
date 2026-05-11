import { Icon, List } from "@raycast/api";

interface ErrorViewProps {
  error: Error | undefined;
}

export function ErrorView({ error }: ErrorViewProps) {
  if (!error) return null;

  return <List.EmptyView title="Error" icon={Icon.Warning} description={error.message} />;
}
