import { Grid, List } from "@raycast/api";
import { layout } from "./preferences";

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = List.Props | Grid.Props;
export function ListOrGrid(props: ListOrGridProps) {
  return layout === "list" ? List(props) : Grid(props);
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection(props: ListOrGridSectionProps) {
  return layout === "list" ? List.Section(props) : Grid.Section(props);
}

type ListOrGridItemProps = List.Item.Props | Grid.Item.Props;
export function ListOrGridItem(props: ListOrGridItemProps) {
  return layout === "list" ? List.Item(props as List.Item.Props) : Grid.Item(props as Grid.Item.Props);
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView(props: ListOrGridEmptyViewProps) {
  return layout === "list" ? List.EmptyView(props) : Grid.EmptyView(props);
}

type ListOrGridDropdownProps = List.Dropdown.Props | Grid.Dropdown.Props;
export function ListOrGridDropdown(props: ListOrGridDropdownProps) {
  return layout === "list" ? List.Dropdown(props as List.Dropdown.Props) : Grid.Dropdown(props as Grid.Dropdown.Props);
}

type ListOrGridDropdownSectionProps = List.Dropdown.Section.Props | Grid.Dropdown.Section.Props;
export function ListOrGridDropdownSection(props: ListOrGridDropdownSectionProps) {
  return layout === "list" ? List.Dropdown.Section(props) : Grid.Dropdown.Section(props);
}

type ListOrGridDropdownItemProps = List.Dropdown.Item.Props | Grid.Dropdown.Item.Props;
export function ListOrGridDropdownItem(props: ListOrGridDropdownItemProps) {
  return layout === "list"
    ? List.Dropdown.Item(props as List.Dropdown.Item.Props)
    : Grid.Dropdown.Item(props as Grid.Dropdown.Item.Props);
}
