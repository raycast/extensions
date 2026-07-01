import { listObjects } from "../api";
import { Space } from "../types";
import { ObjectList } from "./ObjectList";

export function SpaceObjectList(props: { space: Space }) {
  return (
    <ObjectList
      datasetKey={`space:${props.space.id}`}
      searchBarPlaceholder={`Search ${props.space.name} with tag:, site:, format:, &&…`}
      emptyTitle="No Matching Items"
      emptyDescription="Try a different search, use mymind syntax, or switch the type filter."
      loadObjects={({ query }) =>
        listObjects({
          q: query,
          spaceId: props.space.id,
        })
      }
    />
  );
}
