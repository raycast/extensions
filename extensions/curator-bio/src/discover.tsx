import { List } from "@raycast/api";
import { useMe, useItems } from "./lib/hooks";
import { ItemListDetail } from "./components/Item/ItemDetail";
import { useMemo } from "react";
import { Item } from "./lib/types";

export default function Discover() {
  const { isLoading: isMeLoading, data: userResponse, error, userId } = useMe();

  const fetchItems = !error && !!userResponse;

  const { isLoading, data: { data = [] } = {} } = useItems(1, fetchItems);

  const displayItems = useMemo(() => {
    return data
      .filter((item: Item) => item.userId !== userId)
      .sort((a: Item, b: Item) => {
        return new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf();
      });
  }, [data, userId]);

  const isListLoading = isMeLoading || isLoading;

  return (
    <List isLoading={isListLoading} isShowingDetail={true}>
      {displayItems.map((item: any) => (
        <ItemListDetail key={item.id} item={item} />
      ))}
    </List>
  );
}
