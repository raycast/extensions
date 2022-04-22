import { ActionPanel, List, Action } from "@raycast/api";
import useSWR from "swr";
import { useMemo, useState } from "react";

import { getItems } from "./utils/api";
import { ItemListDetail } from "./components/ItemListDetail";
import { ItemDetail } from "./components/ItemDetail";

export default function Index() {
  const [search, setSearch] = useState("");
  const { data } = useSWR(`/api/item/list?keyword=${search}`, () => {
    return getItems({ keyword: search });
  });

  const items = useMemo(() => {
    if (!data || data.data.status !== "success") return [];

    return data.data.data;
  }, [data]);

  return (
    <List isShowingDetail onSearchTextChange={setSearch} isLoading={!data}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          detail={<ItemListDetail id={item.id} ext={item.ext} />}
          actions={
            <ActionPanel>
              <Action.Push target={<ItemDetail item={item} />} title="View Detail" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
