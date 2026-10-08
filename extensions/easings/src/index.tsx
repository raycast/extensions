import { useCallback, useEffect, useState } from "react";

import { Grid, LocalStorage, showToast } from "@raycast/api";

import { customGridItem } from "./components/custom-item";
import { gridItem } from "./components/item";
import { Easing, State } from "./utils/types";

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
    easings: [],
  });
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    (async () => {
      const storedEasings = await LocalStorage.getItem<string>("easings");

      if (!storedEasings) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const easings: Easing[] = JSON.parse(storedEasings);
        setState((previous) => ({ ...previous, easings, isLoading: false }));
      } catch (e) {
        setState((previous) => ({ ...previous, easings: [], isLoading: false }));
      }
    })();
  }, []);

  const handleDelete = useCallback(
    async (index: number, title: string) => {
      const newEasings = [...state.easings];
      newEasings.splice(index, 1);
      setState((previous) => ({ ...previous, easings: newEasings }));
      await LocalStorage.setItem("easings", JSON.stringify(newEasings));
      showToast({
        title: "Success",
        message: `${title} has been deleted`,
      });
    },
    [state.easings, setState],
  );

  const filteredEasings = state.easings.filter(
    (easing) =>
      easing.title.toLowerCase().includes(searchText.toLowerCase()) ||
      easing.type.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder="Search custom easings..."
      onSearchTextChange={setSearchText}
    >
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

      <Grid.Section title="Custom">
        {filteredEasings.map((e, index) =>
          customGridItem(e.id, e.title, e.type, e.value, () => handleDelete(index, e.title)),
        )}
      </Grid.Section>
    </Grid>
  );
}
