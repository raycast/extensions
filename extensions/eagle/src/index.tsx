import { List } from "@raycast/api";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { getItems, getItemThumbnail } from "./utils/api";
import fs from "fs";

function ItemDetail({ id, ext }: { id: string; ext: string }) {
  const { data: thumbnail } = useSWR(`/api/item/thumbnail?id=${id}`, async () => {
    const res = await getItemThumbnail(id);
    const imagePath = decodeURIComponent(res.data.data);

    const content = fs.readFileSync(imagePath, { encoding: "base64" });

    const base64Url = `data:image/${ext};base64,${content}`;
    return base64Url;
  });

  return <List.Item.Detail markdown={`![](${thumbnail})`} isLoading={!thumbnail} />;
}

export default function Command() {
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
        <List.Item key={item.id} title={item.name} detail={<ItemDetail id={item.id} ext={item.ext} />} />
      ))}
    </List>
  );
}
