import { List, Grid } from "@raycast/api";
import { layout } from "./preferences";

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = List.Props | Grid.Props;
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  return layout === "list" ? List(props, context) : Grid(props, context);
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  return layout === "list" ? List.Section(props, context) : Grid.Section(props, context);
}

type ListOrGridItemProps = List.Item.Props | Grid.Item.Props;
export function ListOrGridItem<T>(props: ListOrGridItemProps, context?: T) {
  return layout === "list"
    ? List.Item(props as List.Item.Props, context)
    : Grid.Item(props as Grid.Item.Props, context);
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView<T>(props: ListOrGridEmptyViewProps, context?: T) {
  return layout === "list" ? List.EmptyView(props, context) : Grid.EmptyView(props, context);
}

type ListOrGridDropdownProps = List.Dropdown.Props | Grid.Dropdown.Props;
export function ListOrGridDropdown<T>(props: ListOrGridDropdownProps, context?: T) {
  return layout === "list"
    ? List.Dropdown(props as List.Dropdown.Props, context)
    : Grid.Dropdown(props as Grid.Dropdown.Props, context);
}

type ListOrGridDropdownSectionProps = List.Dropdown.Section.Props | Grid.Dropdown.Section.Props;
export function ListOrGridDropdownSection<T>(props: ListOrGridDropdownSectionProps, context?: T) {
  return layout === "list" ? List.Dropdown.Section(props, context) : Grid.Dropdown.Section(props, context);
}

type ListOrGridDropdownItemProps = List.Dropdown.Item.Props | Grid.Dropdown.Item.Props;
export function ListOrGridDropdownItem<T>(props: ListOrGridDropdownItemProps, context?: T) {
  return layout === "list"
    ? List.Dropdown.Item(props as List.Dropdown.Item.Props, context)
    : Grid.Dropdown.Item(props as Grid.Dropdown.Item.Props, context);
}
