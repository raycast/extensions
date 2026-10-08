import { List, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "./api/clickup";
import { ListTasksView } from "./views/ListTasksView";

export default function ViewDefaultList() {
  const { listId } = getPreferenceValues<Preferences>();

  const {
    isLoading,
    error,
    data: list,
  } = useCachedPromise(async (id: string) => getClickUpClient().getList(id), [listId]);

  if (error && !isLoading && !list) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={Icon.ExclamationMark} title="Failed to load list" />
      </List>
    );
  }

  if (list) {
    return <ListTasksView list={list} />;
  }

  return <List isLoading={isLoading} />;
}
