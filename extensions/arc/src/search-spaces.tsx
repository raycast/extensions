import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSpaces } from "./arc";
import { SpaceListItem } from "./list";
import { VersionCheck } from "./version";

function SearchSpaces() {
  const { data, isLoading } = useCachedPromise(getSpaces);

  return <List isLoading={isLoading}>{data?.map((space) => <SpaceListItem key={space.id} space={space} />)}</List>;
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchSpaces />
    </VersionCheck>
  );
}
