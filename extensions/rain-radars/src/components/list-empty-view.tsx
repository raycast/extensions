import { Grid, List } from "@raycast/api";

export function ListEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "rain-radar-icon.svg", dark: "rain-radar-icon.svg" } }}
      title={"No radars found..."}
      description={""}
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "rain-radar-icon.svg", dark: "rain-radar-icon.svg" } }}
      title={"No radars found..."}
      description={""}
    />
  );
}
