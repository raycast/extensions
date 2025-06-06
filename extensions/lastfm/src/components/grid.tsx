import { ItemProps, ResultItemProps } from "../types";
import { Grid } from "@raycast/api";

export function GridResults(props: ResultItemProps) {
  return (
    <Grid.Section title="Results">
      {props.items.map((item: ItemProps) => (
        <Grid.Item
          key={item.key}
          title={item.title}
          subtitle={item.subtitle}
          content={item.cover}
          accessory={item.accessory}
          actions={item.actions}
        />
      ))}
    </Grid.Section>
  );
}
