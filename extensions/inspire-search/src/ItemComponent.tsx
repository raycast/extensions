import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { abbreviateNames, displayCollaborations } from "./utils";

const ItemComponent = ({ item, index, itemActions, page }: any) => {
  const [itemKey, setItemKey] = useState(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemSubtitle, setItemSubtitle] = useState("");
  const [itemAccessories, setItemAccessories] = useState<{ text: string }[]>([]);

  useEffect(() => {
    setItemKey(item.id);
    setItemTitle(`${index + 9 * page - 8}. ${item.metadata.titles[0].title}`);
    setItemSubtitle(
      item.metadata.authors
        ? abbreviateNames(item.metadata.authors)
        : displayCollaborations(item.metadata.collaborations)
    );
    setItemAccessories([
      { text: `${item.metadata.citation_count} ` },
      { text: `(${item.metadata.earliest_date.slice(0, 4)}) ` },
    ]);
  }, [item]);

  return (
    <List.Item
      key={itemKey}
      title={itemTitle}
      subtitle={itemSubtitle}
      accessories={itemAccessories}
      actions={itemActions}
    />
  );
};

export default ItemComponent;
