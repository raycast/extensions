import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid>
      {Array.from({ length: 20 }).map((_, idx) => (
        <Grid.Item key={idx} content="baiano.png" title={`Baiano ${idx + 1}`} />
      ))}
    </Grid>
  );
}
