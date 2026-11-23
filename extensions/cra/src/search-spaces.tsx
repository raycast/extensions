import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSpaces } from "./cra";
import { ErrorEmptyView } from "./components/error-view";
import { SpaceListItem } from "./list";

function SearchSpaces() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getSpaces);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces">
      {error ? (
        <ErrorEmptyView title="Could not read Cra spaces" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      )}
      {data?.map((space) => <SpaceListItem key={space.id} space={space} />)}
    </List>
  );
}

export default function Command() {
  return <SearchSpaces />;
}
