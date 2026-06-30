import { listObjects } from "../api";
import { Space } from "../types";
import { ObjectList } from "./ObjectList";

export function SpaceObjectList(props: { space: Space }) {
  return (
    <ObjectList
      searchBarPlaceholder={`Search ${props.space.name}…`}
      emptyTitle="No Matching Items"
      emptyDescription="Try a different search or switch the type filter."
      loadObjects={({ query }) =>
        listObjects({
          q: query,
          spaceId: props.space.id,
        })
      }
    />
  );
}
