import { Grid } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getPlayers, getPlayersWithTerms, getSeasons } from "./api";
import { PositionSection } from "./components/player";
import { positionMap } from "./utils";

export default function EPLPlayer() {
  const [terms, setTerms] = useState<string>("");
  const { data: seasons = [] } = usePromise(getSeasons);

  const { isLoading, data, pagination } = usePromise(
    (terms, seasonId) =>
      async ({ page = 0 }) => {
        if (!terms) {
          return seasonId
            ? await getPlayers("-1", seasonId.toString(), page)
            : { data: [], hasMore: false };
        } else if (terms.length >= 3) {
          return await getPlayersWithTerms(terms, page);
        }

        return { data: [], hasMore: false };
      },
    [terms, seasons[0]?.id],
  );

  const positions = groupBy(data, "info.position");

  return (
    <Grid
      throttle
      isLoading={isLoading}
      pagination={pagination}
      searchText={terms}
      onSearchTextChange={setTerms}
      navigationTitle="Players"
    >
      {terms && terms.length < 3 ? (
        <Grid.EmptyView
          icon="player-missing.png"
          title="Please enter a search term with at least 3 characters."
        />
      ) : (
        Object.entries(positionMap).map(([key, value]) => {
          const players = positions[key] || [];

          return (
            <Grid.Section
              key={key}
              title={value}
              children={PositionSection(players)}
            />
          );
        })
      )}
    </Grid>
  );
}
