import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSpaces } from "./cra";
import { SpaceListItem } from "./list";
import { VersionCheck } from "./version";

function SearchSpaces() {
  const { data, isLoading, error } = useCachedPromise(getSpaces);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces">
      {error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not read Cra spaces" description={error.message} />
      )}
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
