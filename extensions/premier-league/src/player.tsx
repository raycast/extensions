import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useState } from "react";
import { getPlayersWithTerms } from "./api";
import { getProfileImg, positions } from "./utils";
import { PlayerProfile } from "./components/player";

export default function EPLPlayer() {
  const [terms, setTerms] = useState<string>("");

  const { isLoading, data, pagination } = usePromise(
    (terms) => async () => {
      return terms && terms.length >= 3
        ? await getPlayersWithTerms(terms)
        : { data: [], hasMore: false };
    },
    [terms],
  );

  const positionMap = groupBy(data, "data.otherFields.position");

  return (
    <Grid
      throttle
      isLoading={isLoading}
      pagination={pagination}
      searchText={terms}
      onSearchTextChange={setTerms}
      navigationTitle="Players"
    >
      {!terms || terms.length < 3 ? (
        <Grid.EmptyView
          icon="premier-league.svg"
          title="Please enter a search term with at least 3 characters."
        />
      ) : (
        positions.map((position) => {
          const players = positionMap[position] || [];

          return (
            <Grid.Section key={position} title={position}>
              {players.map((player) => {
                return (
                  <Grid.Item
                    key={player.data.objectId}
                    title={player.data.otherFields.knownName}
                    subtitle={player.data.otherFields.teamName}
                    keywords={[player.data.otherFields.knownName]}
                    content={{
                      source: getProfileImg(player.data.objectSid),
                      fallback: "player-missing.png",
                    }}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Profile"
                          icon={Icon.Sidebar}
                          target={<PlayerProfile id={player.data.objectSid} />}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </Grid.Section>
          );
        })
      )}
    </Grid>
  );
}
