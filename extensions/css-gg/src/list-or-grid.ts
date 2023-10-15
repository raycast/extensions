import { List, Grid, getPreferenceValues, Image } from "@raycast/api";

const { layout } = getPreferenceValues();

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

type ListOrGridItemProps = (List.Item.Props | Grid.Item.Props) & {
  title: string;
  subtitle?: string;
  content: Image.ImageLike;
};
export function ListOrGridItem<T>(props: ListOrGridItemProps, context?: T) {
  return layout === "list" ? List.Item(props, context) : Grid.Item(props, context);
}
