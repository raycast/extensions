import { ItemProps, ResultItemProps } from "@/types";
import { List } from "@raycast/api";

export function ListResults(props: ResultItemProps) {
  return (
    <List.Section title="Results">
      {props.items.map((item: ItemProps) => (
        <List.Item
          key={item.key}
          icon={item.cover}
          title={item.title}
          subtitle={item.subtitle}
          accessories={item.accessories}
          actions={item.actions}
        />
      ))}
    </List.Section>
  );
}
