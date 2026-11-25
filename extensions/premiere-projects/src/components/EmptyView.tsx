import { Grid, List } from "@raycast/api";

interface EmptyViewProps {
  title: string;
  description: string;
  isGrid?: boolean;
}

export function EmptyView({ title, description, isGrid = false }: EmptyViewProps) {
  if (isGrid) {
    return <Grid.EmptyView icon="extension-icon.png" title={title} description={description} />;
  }
  return <List.EmptyView icon="extension-icon.png" title={title} description={description} />;
}
