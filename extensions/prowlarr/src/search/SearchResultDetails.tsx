import { List } from "@raycast/api";
import { ReleaseResource } from "../prowlarrApi";
import { formatBytes } from "./utils/formatBytes";

export function SearchResultDetails({ item }: { item: ReleaseResource }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={"Title"} text={item.title ?? ""} />
          {!!item.infoUrl && <List.Item.Detail.Metadata.Link title="Info URL" text="Link" target={item.infoUrl} />}
          <List.Item.Detail.Metadata.Label title={"Indexer"} text={item.indexer ?? ""} />
          <List.Item.Detail.Metadata.Label title={"Size"} text={item.size ? formatBytes(item.size) : ""} />
          <List.Item.Detail.Metadata.TagList title="Peers">
            <List.Item.Detail.Metadata.TagList.Item text={`${item.seeders} / ${item.leechers}`} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Categories">
            {item.categories?.map((category, index) => (
              <List.Item.Detail.Metadata.TagList.Item key={index} text={category?.name ?? ""} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
