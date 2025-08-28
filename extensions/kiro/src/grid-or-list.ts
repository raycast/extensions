import { List, Grid } from "@raycast/api";
import { layout } from "./preferences";
import React from "react";

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = List.Props | Grid.Props;
export function ListOrGrid(props: ListOrGridProps) {
  return layout === "list" ? React.createElement(List, props) : React.createElement(Grid, props);
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection(props: ListOrGridSectionProps) {
  return layout === "list" ? React.createElement(List.Section, props) : React.createElement(Grid.Section, props);
}

type ListOrGridItemProps = List.Item.Props | Grid.Item.Props;
export function ListOrGridItem(props: ListOrGridItemProps) {
  return layout === "list"
    ? React.createElement(List.Item, props as List.Item.Props)
    : React.createElement(Grid.Item, props as Grid.Item.Props);
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView(props: ListOrGridEmptyViewProps) {
  return layout === "list" ? React.createElement(List.EmptyView, props) : React.createElement(Grid.EmptyView, props);
}

type ListOrGridDropdownProps = List.Dropdown.Props | Grid.Dropdown.Props;
export function ListOrGridDropdown(props: ListOrGridDropdownProps) {
  return layout === "list"
    ? React.createElement(List.Dropdown, props as List.Dropdown.Props)
    : React.createElement(Grid.Dropdown, props as Grid.Dropdown.Props);
}

type ListOrGridDropdownSectionProps = List.Dropdown.Section.Props | Grid.Dropdown.Section.Props;
export function ListOrGridDropdownSection(props: ListOrGridDropdownSectionProps) {
  return layout === "list"
    ? React.createElement(List.Dropdown.Section, props)
    : React.createElement(Grid.Dropdown.Section, props);
}

type ListOrGridDropdownItemProps = List.Dropdown.Item.Props | Grid.Dropdown.Item.Props;
export function ListOrGridDropdownItem(props: ListOrGridDropdownItemProps) {
  return layout === "list"
    ? React.createElement(List.Dropdown.Item, props as List.Dropdown.Item.Props)
    : React.createElement(Grid.Dropdown.Item, props as Grid.Dropdown.Item.Props);
}
