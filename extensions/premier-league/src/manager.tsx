import { Action, ActionPanel, Detail, Icon, Grid } from "@raycast/api";
import json2md from "json2md";
import { useManagers, useSeasons } from "./hooks";
import { PlayerContent } from "./types";

function PlayerProfile(props: PlayerContent) {
  return (
    <Detail
      navigationTitle={`${props.name.display} | Profile`}
      markdown={json2md([
        { h1: props.name.display },
        {
          img: {
            source: `https://resources.premierleague.com/premierleague/photos/players/250x250/${props.altIds.opta}.png`,
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

export default function Manager() {
  const seasons = useSeasons();
  const managers = useManagers(seasons[0]?.id.toString());

  return (
    <Grid throttle isLoading={!managers}>
      {managers?.map((p) => {
        return (
          <Grid.Item
            key={p.id}
            title={p.name.display}
            subtitle={p.currentTeam?.name}
            content={{
              source: `https://resources.premierleague.com/premierleague/photos/players/40x40/${p.altIds.opta}.png`,
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
