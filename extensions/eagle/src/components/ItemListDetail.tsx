import { List } from "@raycast/api";
import { useThumbnail } from "../utils/query";

export function ItemListDetail({ id }: { id: string }) {
  const { data: thumbnail } = useThumbnail(id);

  return <List.Item.Detail markdown={`![](${thumbnail})`} isLoading={!thumbnail} />;
}
