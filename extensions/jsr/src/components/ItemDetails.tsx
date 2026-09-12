import { List } from "@raycast/api";

import type { SearchResultDocument } from "@/types";

import { usePackage } from "@/hooks/jsrApi";

import PackageMetadata from "@/components/PackageMetadata";

const ItemDetails = ({ item }: { item: SearchResultDocument }) => {
  const { isLoading } = usePackage(item);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={[`## ${item.id}`, item.description].join("\n")}
      metadata={<PackageMetadata item={item} />}
    />
  );
};

export default ItemDetails;
