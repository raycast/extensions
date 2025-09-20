import { Grid } from "@raycast/api";

export default function GridNoItemsPlaceholder({ searchBarAccessory }: { searchBarAccessory?: JSX.Element }) {
  return (
    <Grid searchBarAccessory={searchBarAccessory}>
      <Grid.EmptyView title="No generations found"></Grid.EmptyView>
    </Grid>
  );
}
