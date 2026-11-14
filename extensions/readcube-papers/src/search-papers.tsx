import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { collectionName, getCollections } from "./api";
import { PapersList } from "./papers-list";

export default function SearchPapers() {
  const { data: collections, isLoading, error } = useCachedPromise(getCollections);
  const [selectedId, setSelectedId] = useCachedState<string | undefined>("selected-collection");

  // Fall back to the first (personal) library if nothing is picked or the saved one is gone.
  const collectionId =
    collections?.find((c) => c.id === selectedId)?.id ?? (collections?.length ? collections[0].id : undefined);

  const accessory =
    collections && collections.length > 1 ? (
      <List.Dropdown tooltip="Library" value={collectionId} onChange={setSelectedId}>
        {collections.map((collection) => (
          <List.Dropdown.Item key={collection.id} title={collectionName(collection)} value={collection.id} />
        ))}
      </List.Dropdown>
    ) : undefined;

  return (
    <PapersList
      collectionId={collectionId}
      searchBarAccessory={accessory}
      isLoadingContext={isLoading}
      contextError={error}
    />
  );
}
