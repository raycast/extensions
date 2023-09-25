import { Grid } from "@raycast/api";

export default function GridNoItemsPlaceholder() {
  return (
    <Grid>
      <Grid.EmptyView title="No generations found"></Grid.EmptyView>
    </Grid>
  );
}
