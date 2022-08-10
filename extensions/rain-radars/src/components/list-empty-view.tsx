import { Grid, List } from "@raycast/api";

export function ListEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "rain-radar-icon.png", dark: "rain-radar-icon.png" } }}
      title={"No radars found..."}
      description={""}
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "rain-radar-icon.png", dark: "rain-radar-icon.png" } }}
      title={"No radars found..."}
      description={""}
    />
  );
}
