import { List, Grid, getPreferenceValues } from "@raycast/api";

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = ({ layout?: ListType } & List.Props) | ({ layout?: GridType } & Grid.Props);
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  const { layout, ...rest } = props;
  return layout === "list" ? List(rest, context) : Grid(rest, context);
}

export function getViewLayout(): ListType | GridType {
  const pref = getPreferenceValues();
  return pref.view;
}

export function getGridItemSize(): Grid.ItemSize {
  const pref = getPreferenceValues();
  return pref.griditemsize === "small"
    ? Grid.ItemSize.Small
    : pref.griditemsize === "large"
    ? Grid.ItemSize.Large
    : Grid.ItemSize.Medium;
}
