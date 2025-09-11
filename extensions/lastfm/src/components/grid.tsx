import { Grid } from "@raycast/api";

interface GridItemProps {
  key: string;
  title: string;
  subtitle?: string;
  content?: string;
  accessory?: Grid.Item.Accessory;
  actions?: React.ReactNode;
}

interface GridResultsProps {
  items: GridItemProps[];
}

export function GridResults(props: GridResultsProps) {
  return (
    <Grid.Section title="Results">
      {props.items.map((item) => (
        <Grid.Item
          key={item.key}
          title={item.title}
          subtitle={item.subtitle}
          content={item.content || ""}
          accessory={item.accessory}
          actions={item.actions as Parameters<typeof Grid.Item>[0]["actions"]}
        />
      ))}
    </Grid.Section>
  );
}

export default GridResults;
