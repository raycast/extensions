import { Grid, List, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../lib/types";

const { view } = getPreferenceValues<Preferences>();

type ListOrGridProps = List.Props | Grid.Props;
export function ListOrGrid(props: ListOrGridProps) {
  return view === "list" ? <List {...(props as List.Props)} /> : <Grid {...(props as Grid.Props)} />;
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection(props: ListOrGridSectionProps) {
  return view === "list" ? (
    <List.Section {...(props as List.Section.Props)} />
  ) : (
    <Grid.Section {...(props as Grid.Section.Props)} />
  );
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView(props: ListOrGridEmptyViewProps) {
  return view === "list" ? (
    <List.EmptyView {...(props as List.EmptyView.Props)} />
  ) : (
    <Grid.EmptyView {...(props as Grid.EmptyView.Props)} />
  );
}

type ListOrGridDropdownProps = List.Dropdown.Props | Grid.Dropdown.Props;
export function ListOrGridDropdown(props: ListOrGridDropdownProps) {
  return view === "list" ? (
    <List.Dropdown {...(props as List.Dropdown.Props)} />
  ) : (
    <Grid.Dropdown {...(props as Grid.Dropdown.Props)} />
  );
}

type ListOrGridDropdownSectionProps = List.Dropdown.Section.Props | Grid.Dropdown.Section.Props;
export function ListOrGridDropdownSection(props: ListOrGridDropdownSectionProps) {
  return view === "list" ? (
    <List.Dropdown.Section {...(props as List.Dropdown.Section.Props)} />
  ) : (
    <Grid.Dropdown.Section {...(props as Grid.Dropdown.Section.Props)} />
  );
}

type ListOrGridDropdownItemProps = List.Dropdown.Item.Props | Grid.Dropdown.Item.Props;
export function ListOrGridDropdownItem(props: ListOrGridDropdownItemProps) {
  return view === "list" ? (
    <List.Dropdown.Item {...(props as List.Dropdown.Item.Props)} />
  ) : (
    <Grid.Dropdown.Item {...(props as Grid.Dropdown.Item.Props)} />
  );
}
