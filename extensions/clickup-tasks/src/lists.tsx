import { List } from "@raycast/api";
import { ListListItem } from "./components/lists/ListListItem";
import { EXTENSION_ICON } from "./constants";
import { useLists } from "./hooks/useLists";

export default function () {
  const { error, isLoading, listsBySpace } = useLists();

  if (error && !isLoading && listsBySpace.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={{ source: EXTENSION_ICON }} title="Failed to load lists" />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Browse Lists">
      {listsBySpace.length === 0 && !isLoading && (
        <List.EmptyView
          description="You don't have access to any lists in this workspace"
          icon={{ source: EXTENSION_ICON }}
          title="No lists found"
        />
      )}
      {listsBySpace.map((group) => (
        <List.Section key={group.space.id} title={group.space.name}>
          {group.lists.map((list) => (
            <ListListItem key={list.id} list={list} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
