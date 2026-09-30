import { List } from "@raycast/api";
import { ReleaseResource } from "../prowlarrApi";
import { formatBytes } from "./utils/formatBytes";

export function searchResultAccessories({ item }: { item: ReleaseResource }): List.Item.Accessory[] {
  return [
    {
      tag: `${item.indexer} | ${item.size ? formatBytes(item.size) : ""} | ${item.seeders}/${item.leechers} | ${item.categories?.[0]?.name ?? ""}`,
    },
  ];
}
