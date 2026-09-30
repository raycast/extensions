import { Grid, List } from "@raycast/api";

type ListOrGridItemProps = (List.Item.Props | Grid.Item.Props) & {
  type: "list" | "grid";
};
export function ListOrGridItem(props: ListOrGridItemProps) {
  const { type, ...itemProps } = props;
  return type === "list" ? (
    <List.Item {...(itemProps as List.Item.Props)} />
  ) : (
    <Grid.Item {...(itemProps as Grid.Item.Props)} />
  );
}
