import { List, Grid } from "@raycast/api";

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = ({ layoutType?: ListType } & List.Props) | ({ layoutType?: GridType } & Grid.Props);
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  const { layoutType, ...rest } = props;
  return layoutType === "list" ? List(rest, context) : Grid(rest, context);
}

type ListOrGridSectionProps =
  | ({ layoutType?: ListType } & List.Section.Props)
  | ({ layoutType?: GridType } & Grid.Section.Props);
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  const { layoutType = "list", ...rest } = props;
  return layoutType === "list" ? List.Section(rest, context) : Grid.Section(rest, context);
}

type ListOrGridEmptyViewProps =
  | ({ layoutType?: ListType } & List.EmptyView.Props)
  | ({ layoutType?: GridType } & Grid.EmptyView.Props);
export function ListOrGridEmptyView<T>(props: ListOrGridEmptyViewProps, context?: T) {
  const { layoutType = "list", ...rest } = props;
  return layoutType === "list" ? List.EmptyView(rest, context) : Grid.EmptyView(rest, context);
}

type ListOrGridDropdownProps =
  | ({ layoutType?: ListType } & List.Dropdown.Props)
  | ({ layoutType?: GridType } & Grid.Dropdown.Props);
export function ListOrGridDropdown<T>(props: ListOrGridDropdownProps, context?: T) {
  const { layoutType = "list", ...rest } = props;
  return layoutType === "list"
    ? List.Dropdown(rest as List.Dropdown.Props, context)
    : Grid.Dropdown(rest as Grid.Dropdown.Props, context);
}

type ListOrGridDropdownSectionProps =
  | ({ layoutType?: ListType } & List.Dropdown.Section.Props)
  | ({ layoutType?: GridType } & Grid.Dropdown.Section.Props);
export function ListOrGridDropdownSection<T>(props: ListOrGridDropdownSectionProps, context?: T) {
  const { layoutType = "list", ...rest } = props;
  return layoutType === "list" ? List.Dropdown.Section(rest, context) : Grid.Dropdown.Section(rest, context);
}

type ListOrGridDropdownItemProps =
  | ({ layoutType?: ListType } & List.Dropdown.Item.Props)
  | ({ layoutType?: GridType } & Grid.Dropdown.Item.Props);
export function ListOrGridDropdownItem<T>(props: ListOrGridDropdownItemProps, context?: T) {
  const { layoutType = "list", ...rest } = props;

  return layoutType === "list"
    ? List.Dropdown.Item(rest as List.Dropdown.Item.Props, context)
    : Grid.Dropdown.Item(rest as Grid.Dropdown.Item.Props, context);
}
