import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSpaces } from "./cra";
import { ErrorEmptyView } from "./components/error-view";
import { SpaceListItem } from "./list";
import { VersionCheck } from "./version";

function SearchSpaces() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getSpaces);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces">
      {error && <ErrorEmptyView title="Could not read Cra spaces" error={error} onRetry={revalidate} />}
      {data?.map((space) => <SpaceListItem key={space.id} space={space} />)}
    </List>
  );
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchSpaces />
    </VersionCheck>
  );
}
