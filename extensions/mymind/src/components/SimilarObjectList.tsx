import { searchObjects } from "../api";
import { MyMindObject } from "../types";
import { ObjectList } from "./ObjectList";

export function SimilarObjectList(props: { object: MyMindObject }) {
  return (
    <ObjectList
      datasetKey={`similar:${props.object.id}`}
      searchBarPlaceholder="Search similar items…"
      emptyTitle="No Similar Items"
      emptyDescription="mymind doesn't have any similar items for this object yet."
      errorTitle="Couldn't load similar items"
      loadObjects={({ query }) =>
        searchObjects({
          q: query,
          similarTo: props.object.id,
          limit: 200,
        })
      }
    />
  );
}
