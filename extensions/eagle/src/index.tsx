import { ActionPanel, List, Detail, Action } from "@raycast/api";
import useSWR from "swr";
import { useMemo, useState } from "react";

import { getItems } from "./utils/api";
import { useThumbnail } from "./utils/query";
import { Item } from "./@types/eagle";

function ItemListDetail({ id, ext }: { id: string; ext: string }) {
  const { data: thumbnail } = useThumbnail(id, ext);

  return <List.Item.Detail markdown={`![](${thumbnail})`} isLoading={!thumbnail} />;
}

function ItemDetail({ item }: { item: Item }) {
  const { data: thumbnail } = useThumbnail(item.id, item.ext);

  const lastModifiedAt = useMemo(() => {
    const date = new Date(item.modificationTime);

    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }, [item]);

  const annotation = useMemo(() => {
    if (item.annotation) {
      return item.annotation.replaceAll("<br>", "\n");
    }

    return "";
  }, [item]);

  return (
    <Detail
      navigationTitle={item.name}
      markdown={`# ${item.name}
  
  ![](${thumbnail})`}
      isLoading={!thumbnail}
      metadata={
        <Detail.Metadata>
          {item.palettes.length > 0 ? (
            <Detail.Metadata.TagList title="Palettes">
              {item.palettes.slice(0, 6).map((palette, index) => {
                const color = `#${palette.color.map((c) => c.toString(16)).join("")}`;
                const ratio = palette.ratio > 1 ? palette.ratio.toFixed(0) : palette.ratio.toFixed(1);

                return <Detail.Metadata.TagList.Item text={`▆▆ (${ratio}%)`} color={color} key={index} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          <Detail.Metadata.Label title="ID" text={item.id} />
          <Detail.Metadata.Label title="Name" text={item.name} />

          {item.annotation ? <Detail.Metadata.Label title="Annotation" text={annotation} /> : null}

          {item.tags && item.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {item.tags.map((tag, index) => (
                <Detail.Metadata.TagList.Item text={tag} key={index} />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Ext" text={item.ext} />
          <Detail.Metadata.Label title="Dimension" text={`${item.width} x ${item.height}`} />
          <Detail.Metadata.Label title="Last Modified" text={lastModifiedAt} />
          <Detail.Metadata.Link title="URL" target={item.url} text={item.url} />
        </Detail.Metadata>
      }
    />
  );
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
