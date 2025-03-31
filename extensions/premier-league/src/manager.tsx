import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { useState } from "react";
import { getManagers } from "./api";
import SearchBarSeason from "./components/searchbar_season";
import { Player } from "./types";
import { getProfileImg } from "./utils";

function PlayerProfile(props: Player) {
  return (
    <Detail
      navigationTitle={`${props.name.display} | Profile`}
      markdown={json2md([
        { h1: props.name.display },
        {
          img: {
            source: getProfileImg(props.altIds.opta),
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Nationality"
            text={props.birth.country.country}
          />
          <Detail.Metadata.Label
            title="Date of Birth"
            text={props.birth.date.label}
          />
          <Detail.Metadata.Label title="Age" text={props.age} />
          <Detail.Metadata.Label
            title="Team"
            text={props.currentTeam?.club.name}
          />
        </Detail.Metadata>
      }
    />
  );
}

export default function EPLManager() {
  const [seasonId, setSeasonId] = useState<string>();

  const { data: managers, isLoading } = usePromise(
    async (season) => (season ? await getManagers(season) : undefined),
    [seasonId],
  );

  return (
    <Grid
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <SearchBarSeason selected={seasonId} onSelect={setSeasonId} />
      }
    >
      {managers?.map((p) => {
        return (
          <Grid.Item
            key={p.id}
            title={p.name.display}
            subtitle={p.currentTeam?.name}
            content={{
              source: getProfileImg(p.altIds.opta),
              fallback: "player-missing.png",
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Manager Profile"
                  icon={Icon.Sidebar}
                  target={<PlayerProfile {...p} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
