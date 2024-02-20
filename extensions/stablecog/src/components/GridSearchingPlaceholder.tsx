import { Grid } from "@raycast/api";

export default function GridSearchingPlaceholder({ searchBarAccessory }: { searchBarAccessory?: JSX.Element }) {
  return (
    <Grid searchBarAccessory={searchBarAccessory}>
      <Grid.EmptyView title="Searching..."></Grid.EmptyView>
    </Grid>
  );
}
