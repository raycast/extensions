import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Item } from "../@types/eagle";
import { ItemDetail } from "./ItemDetail";
import { ItemListDetail } from "./ItemListDetail";
import { FolderNavigationActions } from "./FolderNavigationActions";
import { MoveToTrashAction } from "./MoveToTrashAction";
import { EditItemTagsAction } from "./EditItemTagsAction";
import { EditItemAnnotationAction } from "./EditItemAnnotationAction";

export default function EagleItem({ item, onUpdate }: { item: Item; onUpdate?: () => void }) {
  return (
    <List.Item
      title={item.name}
      detail={<ItemListDetail id={item.id} />}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <Action.Push target={<ItemDetail item={item} />} title="View Detail" icon={Icon.Eye} />
          <FolderNavigationActions item={item} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          {!item.isDeleted && (
            <>
              <ActionPanel.Section title="Edit">
                <EditItemTagsAction item={item} onUpdate={onUpdate} />
                <EditItemAnnotationAction item={item} onUpdate={onUpdate} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <MoveToTrashAction item={item} onUpdate={onUpdate} />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
