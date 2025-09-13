import { Grid } from "@raycast/api";

export function LoadingGrid() {
  return (
    <Grid>
      <Grid.Item
        content={{ source: "https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Loading..." }}
        title="Loading..."
        subtitle="Checking for API key..."
      />
    </Grid>
  );
}
