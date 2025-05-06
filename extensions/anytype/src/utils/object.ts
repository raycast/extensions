import { getPreferenceValues, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { Member, Property, SortProperty, SpaceObject, Type } from "../models";
import { getDateLabel, getShortDateLabel } from "../utils";

export function processObject(
  object: SpaceObject,
  isPinned: boolean,
  mutateObjects: MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>,
  mutatePinnedObjects?: MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>,
) {
  const { sort } = getPreferenceValues();
  // If sort is 'Name', fall back to using 'LastModifiedDate' for date details
  const sortForDate = sort === SortProperty.Name ? SortProperty.LastModifiedDate : sort;
  const dateProperty = object.properties.find((property) => property.key === sortForDate);
  const date = dateProperty && dateProperty.date ? dateProperty.date : undefined;
  const hasValidDate = date && new Date(date).getTime() !== 0;

  // Use proper labels: if sort is 'Name', use Last Modified labels
  const label = sort === SortProperty.Name ? "Last Modified Date" : getDateLabel();
  const shortLabel = sort === SortProperty.Name ? "Modified" : getShortDateLabel();

  return {
    spaceId: object.space_id,
    id: object.id,
    icon: object.icon,
    title: object.name,
    subtitle: {
      value: object.type.name,
      tooltip: `Type: ${object.type.name}`,
    },
    accessories: [
      ...(isPinned ? [{ icon: Icon.Star, tooltip: "Pinned" }] : []),
      {
        date: hasValidDate ? new Date(date) : undefined,
        tooltip: hasValidDate
          ? `${label}: ${format(new Date(date), "EEEE d MMMM yyyy 'at' HH:mm")}`
          : `Never ${shortLabel}`,
        text: hasValidDate ? undefined : "—",
      },
    ],
    mutate: [mutateObjects, mutatePinnedObjects].filter(Boolean) as MutatePromise<
      SpaceObject[] | Type[] | Property[] | Member[]
    >[],
    object: object,
    layout: object.layout,
    isPinned,
  };
}
