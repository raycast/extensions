import { Grid, List } from "@raycast/api";

type ListOrGridItemProps = (List.Item.Props | Grid.Item.Props) & {
  type: "list" | "grid";
};
export function ListOrGridItem<T>(props: ListOrGridItemProps, context?: T) {
  const { type, ...itemProps } = props;
  return type === "list"
    ? List.Item(itemProps as List.Item.Props, context)
    : Grid.Item(itemProps as Grid.Item.Props, context);
}
