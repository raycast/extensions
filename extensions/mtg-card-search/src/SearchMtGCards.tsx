import { useState } from "react";
import { Grid, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchCards } from "./services";
import GridCardItem from "./components/GridCardItem";

const NUM_COLS = 3;

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data } = usePromise(fetchCards, [searchText], {
    onError: async () => {
      await showToast({ title: "Error fetching cards" });
    },
    execute: searchText.length >= 3,
  });

  return (
    <Grid
      columns={NUM_COLS}
      filtering={false}
      fit={Grid.Fit.Contain}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by card name"
      throttle
    >
      <>
        <Grid.EmptyView
          title={searchText.length >= 3 ? "No results found" : "Provide some card name to query"}
          icon="rakdos.png"
        />
        <Grid.Section>
          {data?.map((card) => <GridCardItem key={card.id} card={card} isLoading={isLoading} />)}
        </Grid.Section>
      </>
    </Grid>
  );
}
