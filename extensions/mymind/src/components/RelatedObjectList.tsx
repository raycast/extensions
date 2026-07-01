import { getObject, listLinks } from "../api";
import { MyMindObject } from "../types";
import { ObjectList } from "./ObjectList";
import { getRelatedObjectIds, matchesRelatedItemSearch } from "../object-links";
import { TypeFilter } from "../object-query";
import { getObjectKind } from "../object-kind";
import { getObjectDisplayTitle } from "../display-title";

function matchesTypeFilter(item: MyMindObject, typeFilter: TypeFilter): boolean {
  if (typeFilter === "all") {
    return true;
  }

  const kind = getObjectKind(item);

  if (typeFilter === "article") {
    return kind === "link";
  }

  return kind === typeFilter;
}

export function RelatedObjectList(props: { object: MyMindObject }) {
  const objectTitle = getObjectDisplayTitle(props.object);

  return (
    <ObjectList
      datasetKey={`related:${props.object.id}`}
      searchBarPlaceholder={`Filter items related to ${objectTitle}…`}
      emptyTitle="No Related Items"
      emptyDescription="mymind doesn't have any linked items for this object yet."
      errorTitle="Couldn't load related items"
      loadObjects={async ({ searchText, typeFilter }) => {
        const links = await listLinks();
        const relatedIds = getRelatedObjectIds(props.object.id, links);

        if (relatedIds.length === 0) {
          return [];
        }

        const relatedObjects = await Promise.all(
          relatedIds.map(async (id) => {
            try {
              return await getObject(id);
            } catch {
              return undefined;
            }
          }),
        );

        return relatedObjects
          .filter((item): item is MyMindObject => Boolean(item) && !item.deleted)
          .filter((item) => matchesTypeFilter(item, typeFilter))
          .filter((item) => matchesRelatedItemSearch(item, searchText));
      }}
    />
  );
}
