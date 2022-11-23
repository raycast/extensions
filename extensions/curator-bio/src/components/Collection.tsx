import { List } from "@raycast/api";
import { ItemListDetail } from "./Item/ItemDetail";
import { useCollectionItems } from "../lib/hooks";
import { User } from "../lib/types";

export default function Collection({
  userId,
  collectionId,
  user,
}: {
  userId: string;
  collectionId: string;
  user: User;
}) {
  const { isLoading, data: { data = [] } = {} } = useCollectionItems(userId, collectionId);

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {data.map((item: any) => (
        <ItemListDetail
          key={item.id}
          item={{
            ...item,
            user,
          }}
          collectionInfo={{
            userId,
            collectionId,
          }}
        />
      ))}
    </List>
  );
}
