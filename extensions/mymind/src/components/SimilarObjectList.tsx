import { isMissingEmbeddingError, searchObjects } from "../api";
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
      errorEmptyView={(error) => {
        if (isMissingEmbeddingError(error)) {
          return {
            title: "Similar Items Unavailable",
            description: "mymind hasn't generated an embedding for this item yet.",
          };
        }

        return undefined;
      }}
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
