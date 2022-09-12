import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import json2md from "json2md";
import { useState } from "react";
import { useClubs, useSeasons } from "./hooks";
import Player from "./player";
import { TeamTeam } from "./types";

function ClubProfile(props: TeamTeam) {
  return (
    <Detail
      navigationTitle={`${props.name} | Club`}
      markdown={json2md([
        { h1: props.name },
        {
          img: {
            // source: `https://resources.premierleague.com/premierleague/badges/${props.altIds.opta}.svg`,
            source: `https://resources.premierleague.com/premierleague/badges/100/${props.altIds.opta}@x2.png`,
          },
        },
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Stadium" text={props.grounds[0].name} />
          <Detail.Metadata.Label
            title="Capacity"
            text={props.grounds[0].capacity?.toString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Squad"
            icon={Icon.Person}
            target={<Player club={props.club} />}
          />
          <Action.OpenInBrowser
            url={`https://www.premierleague.com/clubs/${
              props.id
            }/${props.name.replace(/ /g, "-")}/overview`}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Club() {
  const seasons = useSeasons();
  const [selectedSeason, setSeason] = useState<string>(
    seasons[0]?.id.toString()
  );
  const clubs = useClubs(selectedSeason);

  return (
    <Grid
      throttle
      isLoading={!clubs}
      inset={Grid.Inset.Medium}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Season"
          value={selectedSeason}
          onChange={setSeason}
        >
          <Grid.Dropdown.Section>
            {seasons.map((season) => {
              return (
                <Grid.Dropdown.Item
                  key={season.id}
                  value={season.id.toString()}
                  title={season.label}
                />
              );
            })}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {clubs?.map((team) => {
        return (
          <Grid.Item
            key={team.id}
            title={team.name}
            subtitle={team.grounds[0].name}
            content={{
              source: `https://resources.premierleague.com/premierleague/badges/100/${team.altIds.opta}@x2.png`,
              fallback: "default.png",
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Club Profile"
                  icon={Icon.Sidebar}
                  target={<ClubProfile {...team} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
