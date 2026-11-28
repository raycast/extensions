import { Grid, Image, List } from "@raycast/api";

interface EmptyViewProps {
  title: string;
  description: string;
  isGrid?: boolean;
  icon?: Image.ImageLike;
  actions?: React.ReactNode;
}

export function EmptyView({
  title,
  description,
  isGrid = false,
  icon = "extension-icon.png",
  actions,
}: EmptyViewProps) {
  if (isGrid) {
    return <Grid.EmptyView icon={icon} title={title} description={description} actions={actions} />;
  }
  return <List.EmptyView icon={icon} title={title} description={description} actions={actions} />;
}
