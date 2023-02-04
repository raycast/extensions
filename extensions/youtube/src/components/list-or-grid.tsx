import { List, Grid, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../lib/types";

const { viewLayout } = getPreferenceValues<Preferences>();

type ListOrGridProps = List.Props | Grid.Props;
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  return viewLayout === "list" ? List(props, context) : Grid(props, context);
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  return viewLayout === "list" ? List.Section(props, context) : Grid.Section(props, context);
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView<T>(props: ListOrGridEmptyViewProps, context?: T) {
  return viewLayout === "list" ? List.EmptyView(props, context) : Grid.EmptyView(props, context);
}
