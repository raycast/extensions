import { Grid } from "@raycast/api";

import { gridItem } from "./components/item";

export default function Command() {
  return (
    <Grid columns={8} inset={Grid.Inset.Zero}>
      <Grid.Section title="Ease In Out">
        {gridItem("sine", "in", "out")}
        {gridItem("quad", "in", "out")}
        {gridItem("cubic", "in", "out")}
        {gridItem("quart", "in", "out")}
        {gridItem("circ", "in", "out")}
        {gridItem("quint", "in", "out")}
        {gridItem("expo", "in", "out")}
        {gridItem("back", "in", "out")}
      </Grid.Section>

      <Grid.Section title="Ease In">
        {gridItem("sine", "in")}
        {gridItem("quad", "in")}
        {gridItem("cubic", "in")}
        {gridItem("quart", "in")}
        {gridItem("circ", "in")}
        {gridItem("quint", "in")}
        {gridItem("expo", "in")}
        {gridItem("back", "in")}
      </Grid.Section>

      <Grid.Section title="Ease Out">
        {gridItem("sine", "out")}
        {gridItem("quad", "out")}
        {gridItem("cubic", "out")}
        {gridItem("quart", "out")}
        {gridItem("circ", "out")}
        {gridItem("quint", "out")}
        {gridItem("expo", "out")}
        {gridItem("back", "out")}
      </Grid.Section>
    </Grid>
  );
}
