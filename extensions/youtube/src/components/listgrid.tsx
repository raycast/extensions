import { List, Grid, getPreferenceValues } from "@raycast/api";

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = ({ layout?: ListType } & List.Props) | ({ layout?: GridType } & Grid.Props);
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  const { layout, ...rest } = props;
  return layout === "list" ? List(rest, context) : Grid(rest, context);
}

type ListOrGridSectionProps =
  | ({ layout?: ListType } & List.Section.Props)
  | ({ layout?: GridType } & Grid.Section.Props);
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  const { layout = "list", ...rest } = props;
  return layout === "list" ? List.Section(rest, context) : Grid.Section(rest, context);
}

type ListOrGridEmptyViewProps =
  | ({ layout?: ListType } & List.EmptyView.Props)
  | ({ layout?: GridType } & Grid.EmptyView.Props);
export function ListOrGridEmptyView<T>(props: ListOrGridEmptyViewProps, context?: T) {
  const { layout = "list", ...rest } = props;
  return layout === "list" ? List.EmptyView(rest, context) : Grid.EmptyView(rest, context);
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
