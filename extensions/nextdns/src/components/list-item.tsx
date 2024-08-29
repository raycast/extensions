import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DomainListItem } from "../types/nextdns";

//TODO: Optimize optimistic update
//TODO: Ensure naming, site or domain?
export function ListItem({
  siteItem,
  onRemoveItem,
}: {
  siteItem: DomainListItem;
  onRemoveItem: (item: DomainListItem) => Promise<void>;
}) {
  return (
    <List.Item
      id={siteItem.id}
      key={siteItem.id}
      title={`*.${siteItem.id}`}
      icon={
        siteItem.active
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      actions={<Actions item={siteItem} onItemRemove={onRemoveItem} />}
    />
  );
}

function Actions({
  item,
  onItemRemove,
}: {
  item: DomainListItem;
  onItemRemove: (item: DomainListItem) => Promise<void>;
}) {
  return (
    <ActionPanel title={`Manage ${item.id}`}>
      <Action
        title={`${item.active ? "Deactivate" : "Activate"} Site`}
        icon={item.active ? Icon.XMarkCircle : Icon.CheckCircle}
        onAction={async () => {
          await onItemRemove(item);
        }}
      />
    </ActionPanel>
  );
}
