import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Item } from "../@types/eagle";
import { ItemDetail } from "./ItemDetail";
import { ItemListDetail } from "./ItemListDetail";

export default function EagleItem({ item }: { item: Item }) {
  return (
    <List.Item
      title={item.name}
      detail={<ItemListDetail id={item.id} ext={item.ext} />}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <Action.Push target={<ItemDetail item={item} />} title="View Detail" />
        </ActionPanel>
      }
    />
  );
}
