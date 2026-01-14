import { useCachedPromise } from "@raycast/utils";
import { attio } from "./attio";
import { Icon, List } from "@raycast/api";

export default function Lists() {
  const {
    isLoading,
    data: lists,
    error,
  } = useCachedPromise(
    async () => {
      const { data } = await attio.lists.listAll();
      return data;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !lists.length && !error ? (
        <List.EmptyView icon="empty/list.svg" title="No lists yet" description="There are currently no lists created" />
      ) : (
        lists.map((list) => <List.Item key={list.id.listId} icon={Icon.List} title={list.name} />)
      )}
    </List>
  );
}
