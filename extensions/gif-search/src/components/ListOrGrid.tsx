import { List } from "@raycast/api";

type ListType = "list";
type GridType = "grid";

export function ListOrGrid(props: ({ layoutType?: ListType } & List.Props) | { layoutType?: GridType }) {
  const { layoutType, ...rest } = props;
  // TODO: Return Grid component when Grid is released
  return layoutType === "list" ? List(rest) : List(rest);
}

export function ListOrGridSection(props: ({ layoutType?: ListType } & List.Section.Props) | { layoutType?: GridType }) {
  const { layoutType = "list", ...rest } = props;
  // TODO: Return Grid component when Grid is released
  return layoutType === "list" ? List.Section(rest) : List.Section(rest);
}

export function ListOrGridDropdown(
  props: ({ layoutType?: ListType } & List.Dropdown.Props) | { layoutType?: GridType }
) {
  const { layoutType = "list", ...rest } = props;
  // TODO: Return Grid component when Grid is released
  return layoutType === "list"
    ? List.Dropdown(rest as List.Dropdown.Props)
    : List.Dropdown(rest as List.Dropdown.Props);
}

export function ListOrGridDropdownSection(
  props: ({ layoutType?: ListType } & List.Dropdown.Section.Props) | { layoutType?: GridType }
) {
  const { layoutType = "list", ...rest } = props;
  // TODO: Return Grid component when Grid is released
  return layoutType === "list" ? List.Dropdown.Section(rest) : List.Dropdown.Section(rest);
}

export function ListOrGridDropdownItem(
  props: ({ layoutType?: ListType } & List.Dropdown.Item.Props) | { layoutType?: GridType }
) {
  const { layoutType = "list", ...rest } = props;
  // TODO: Return Grid component when Grid is released
  return layoutType === "list"
    ? List.Dropdown.Item(rest as List.Dropdown.Item.Props)
    : List.Dropdown.Item(rest as List.Dropdown.Item.Props);
}

export function ListOrGridEmptyView(
  props: ({ layoutType?: ListType } & List.EmptyView.Props) | { layoutType?: GridType }
) {
  const { layoutType = "list", ...rest } = props;
  // TODO: Return Grid component when Grid is released
  return layoutType === "list" ? List.EmptyView(rest) : List.EmptyView(rest);
}
