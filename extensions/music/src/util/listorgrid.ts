import { List, Grid, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const { gridItemSize, layoutType, playlistTracksLayout } = preferences;

export type ListType = "list";
export type GridType = "grid";

type ListOrGridProps = ({ overrideLayout?: string } & List.Props) | ({ overrideLayout?: string } & Grid.Props);
export function ListOrGrid<T>(props: ListOrGridProps, context?: T) {
  const layout = props.overrideLayout || layoutType;
  return layout === "list" ? List(props, context) : Grid(props, context);
}

type ListOrGridSectionProps = List.Section.Props | Grid.Section.Props;
export function ListOrGridSection<T>(props: ListOrGridSectionProps, context?: T) {
  return layoutType === "list" ? List.Section(props, context) : Grid.Section(props, context);
}

type ListOrGridEmptyViewProps = List.EmptyView.Props | Grid.EmptyView.Props;
export function ListOrGridEmptyView<T>(props: ListOrGridEmptyViewProps, context?: T) {
  return layoutType === "list" ? List.EmptyView(props, context) : Grid.EmptyView(props, context);
}

type ListOrGridDropdownProps = List.Dropdown.Props | Grid.Dropdown.Props;
export function ListOrGridDropdown<T>(props: ListOrGridDropdownProps, context?: T) {
  return layoutType === "list"
    ? List.Dropdown(props as List.Dropdown.Props, context)
    : Grid.Dropdown(props as Grid.Dropdown.Props, context);
}

type ListOrGridDropdownSectionProps = List.Dropdown.Section.Props | Grid.Dropdown.Section.Props;
export function ListOrGridDropdownSection<T>(props: ListOrGridDropdownSectionProps, context?: T) {
  return layoutType === "list" ? List.Dropdown.Section(props, context) : Grid.Dropdown.Section(props, context);
}

type ListOrGridDropdownItemProps = List.Dropdown.Item.Props | Grid.Dropdown.Item.Props;
export function ListOrGridDropdownItem<T>(props: ListOrGridDropdownItemProps, context?: T) {
  return layoutType === "list"
    ? List.Dropdown.Item(props as List.Dropdown.Item.Props, context)
    : Grid.Dropdown.Item(props as Grid.Dropdown.Item.Props, context);
}

export const getViewLayout = (): string => {
  return layoutType;
};

export const getPlaylistTracksLayout = (): string => {
  return playlistTracksLayout;
};

export const getGridItemSize = (): Grid.ItemSize => {
  if (gridItemSize == "small") return Grid.ItemSize.Small;
  else if (gridItemSize == "large") return Grid.ItemSize.Large;
  else return Grid.ItemSize.Medium;
};

export const getMaxNumberOfResults = (overrideLayout?: string): number => {
  const layout = overrideLayout || layoutType;
  if (layout == "list") return 100;
  if (gridItemSize == "small") return 32;
  else if (gridItemSize == "large") return 15;
  else return 25;
};

type ImageSize = {
  width: number;
  height: number;
};

export const getImageSize = (overrideLayout?: string): ImageSize => {
  const layout = overrideLayout || layoutType;
  if (layout == "list") return { width: 32, height: 32 };
  if (gridItemSize == "small") return { width: 128, height: 128 };
  else if (gridItemSize == "large") return { width: 300, height: 300 };
  else return { width: 200, height: 200 };
};
