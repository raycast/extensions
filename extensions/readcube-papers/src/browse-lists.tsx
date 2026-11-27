import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { APP_URL, Collection, collectionName, getCollections, getLists, PaperList } from "./api";
import { ErrorView, PapersList } from "./papers-list";

export default function BrowseLists() {
  const { data: collections, isLoading, error } = useCachedPromise(getCollections);

  if (collections?.length === 1 && !error) {
    return <CollectionLists collection={collections[0]} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter libraries">
      {error ? (
        <ErrorView error={error} title="Couldn't Load Lists" />
      ) : (
        collections?.map((collection) => (
          <List.Item
            key={collection.id}
            title={collectionName(collection)}
            icon={collection.shared ? Icon.TwoPeople : Icon.Book}
            accessories={collection.shared ? [{ tag: "Shared" }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Lists"
                  icon={Icon.List}
                  target={<CollectionLists collection={collection} navigationTitle={collectionName(collection)} />}
                />
                <Action.Push
                  title="Show All Papers"
                  icon={Icon.Document}
                  target={<PapersList collectionId={collection.id} navigationTitle={collectionName(collection)} />}
                />
                <Action.OpenInBrowser title="Open in ReadCube" url={`${APP_URL}/library/${collection.id}/all`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// navigationTitle is only set when pushed; as the command's root view it keeps the command title.
function CollectionLists({ collection, navigationTitle }: { collection: Collection; navigationTitle?: string }) {
  const { data: lists, isLoading, error } = useCachedPromise(getLists, [collection.id]);
  const name = collectionName(collection);

  // Show nested lists as "Parent › Child" so they stay searchable in one flat list.
  const byId = new Map(lists?.map((l) => [l.id, l]));
  const pathOf = (list: PaperList): string => {
    const names = [list.name.trim()];
    const seen = new Set([list.id]);
    let parent = list.parent_id ? byId.get(list.parent_id) : undefined;
    while (parent && !seen.has(parent.id)) {
      names.unshift(parent.name.trim());
      seen.add(parent.id);
      parent = parent.parent_id ? byId.get(parent.parent_id) : undefined;
    }
    return names.join(" › ");
  };
  const sorted = (lists ?? [])
    .map((list) => ({ list, path: pathOf(list) }))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle} searchBarPlaceholder={`Filter lists in ${name}`}>
      {error ? (
        <ErrorView error={error} title="Couldn't Load Lists" />
      ) : (
        <>
          <List.Item
            title="All Papers"
            icon={{ source: Icon.Book, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Papers"
                  icon={Icon.Document}
                  target={<PapersList collectionId={collection.id} navigationTitle={name} />}
                />
                <Action.OpenInBrowser title="Open in ReadCube" url={`${APP_URL}/library/${collection.id}/all`} />
              </ActionPanel>
            }
          />
          <List.Section title="Lists" subtitle={lists ? String(lists.length) : undefined}>
            {sorted.map(({ list, path }) => (
              <List.Item
                key={list.id}
                title={path}
                icon={list.parent_id ? Icon.ChevronRight : Icon.List}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Papers"
                      icon={Icon.Document}
                      target={<PapersList collectionId={collection.id} listId={list.id} navigationTitle={path} />}
                    />
                    <Action.OpenInBrowser
                      title="Open in ReadCube"
                      url={`${APP_URL}/library/${collection.id}/list/${list.id}`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
