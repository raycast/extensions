import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Item } from "../@types/eagle";
import { ItemDetail } from "./ItemDetail";
import { ItemListDetail } from "./ItemListDetail";
import { FolderNavigationActions } from "./FolderNavigationActions";
import { MoveToTrashAction } from "./MoveToTrashAction";

export default function EagleItem({ item, onTrash }: { item: Item; onTrash?: () => void }) {
  return (
    <List.Item
      title={item.name}
      detail={<ItemListDetail id={item.id} ext={item.ext} />}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <Action.Push target={<ItemDetail item={item} />} title="View Detail" />
          <FolderNavigationActions item={item} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <ActionPanel.Section>
            <MoveToTrashAction item={item} onTrash={onTrash} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
