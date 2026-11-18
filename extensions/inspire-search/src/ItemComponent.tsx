import { List } from "@raycast/api";
import { abbreviateNames, displayCollaborations } from "./utils";
import type { InspireItem } from "./types";

type ItemComponentProps = {
  item: InspireItem;
  index: number;
  itemActions: List.Item.Props["actions"];
  page: number;
};

const ItemComponent = ({ item, index, itemActions, page }: ItemComponentProps) => {
  const itemTitle = `${index + 9 * page - 8}. ${item.metadata.titles[0].title}`;
  const itemSubtitle = item.metadata.authors
    ? abbreviateNames(item.metadata.authors)
    : displayCollaborations(item.metadata.collaborations ?? []);
  const itemAccessories = [
    { text: `${item.metadata.citation_count} ` },
    { text: `(${item.metadata.earliest_date.slice(0, 4)}) ` },
  ];

  return (
    <List.Item
      key={item.id}
      title={itemTitle}
      subtitle={itemSubtitle}
      accessories={itemAccessories}
      actions={itemActions}
    />
  );
};

export default ItemComponent;
