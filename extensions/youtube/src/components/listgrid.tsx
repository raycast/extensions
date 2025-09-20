import { Grid, List, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../lib/types";

const { view } = getPreferenceValues<Preferences>();

type ListOrGridProps = List.Props | Grid.Props;
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  return view === "list" ? List(props, context) : Grid(props, context);
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  return view === "list" ? List.Section(props, context) : Grid.Section(props, context);
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView<T>(props: ListOrGridEmptyViewProps, context?: T) {
  return view === "list" ? List.EmptyView(props, context) : Grid.EmptyView(props, context);
}

type ListOrGridDropdownProps = List.Dropdown.Props | Grid.Dropdown.Props;
export function ListOrGridDropdown<T>(props: ListOrGridDropdownProps, context?: T) {
  return view === "list" ? List.Dropdown(props, context) : Grid.Dropdown(props, context);
}

type ListOrGridDropdownSectionProps = List.Dropdown.Section.Props | Grid.Dropdown.Section.Props;
export function ListOrGridDropdownSection<T>(props: ListOrGridDropdownSectionProps, context?: T) {
  return view === "list" ? List.Dropdown.Section(props, context) : Grid.Dropdown.Section(props, context);
}

type ListOrGridDropdownItemProps = List.Dropdown.Item.Props | Grid.Dropdown.Item.Props;
export function ListOrGridDropdownItem<T>(props: ListOrGridDropdownItemProps, context?: T) {
  return view === "list" ? List.Dropdown.Item(props, context) : Grid.Dropdown.Item(props, context);
}
