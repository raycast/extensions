import { Icon, List } from "@raycast/api";
import { Item } from "../types";

export default function ItemsSection({ title, items, icon }: { title: string; items: Item[]; icon: Icon }) {
  return (
    <List.Section title={title} subtitle={items.length.toString()}>
      {items.map((item) => (
        <List.Item key={item.id} icon={icon} title={item.name} />
      ))}
    </List.Section>
  );
}
