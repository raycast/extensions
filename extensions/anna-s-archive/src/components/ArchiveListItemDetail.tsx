import { memo, useMemo } from "react";

import { List } from "@raycast/api";

import type { ArchiveItem } from "@/api/archive";

interface ArchiveListItemDetailProps {
  item: ArchiveItem;
}

const ArchiveListItemDetailF = ({ item }: ArchiveListItemDetailProps) => {
  const markdown = useMemo(() => {
    if (item.cover !== null) {
      return `<img src="${item.cover}" alt="cover" height="180"/>`;
    }
    return undefined;
  }, [item.cover]);
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={item.title} />
          <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Author" text={item.author} />
          <List.Item.Detail.Metadata.Label title="Published" text={item.publisher} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Type" text={item.type} />
          <List.Item.Detail.Metadata.Label title="Language" text={item.language} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Size" text={`${item.size} MB`} />
          <List.Item.Detail.Metadata.Label title="Extension" text={item.ext} />
          <List.Item.Detail.Metadata.Label title="Filename" text={item.fileName || ""} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const ArchiveListItemDetail = memo(ArchiveListItemDetailF);

export default ArchiveListItemDetail;
