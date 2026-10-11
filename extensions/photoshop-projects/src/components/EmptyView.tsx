import { Grid, Icon, List } from "@raycast/api";

interface EmptyViewProps {
  title: string;
  description: string;
  isGrid?: boolean;
}

export function EmptyView({ title, description, isGrid = false }: EmptyViewProps) {
  if (isGrid) {
    return <Grid.EmptyView icon={Icon.EyeDisabled} title={title} description={description} />;
  }

  return <List.EmptyView icon={Icon.EyeDisabled} title={title} description={description} />;
}
