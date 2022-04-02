import { Action, ActionPanel, Detail, List, Icon } from "@raycast/api";
import json2md from "json2md";
import { useState } from "react";
import { useClubs, useSeasons } from "./hooks";
import Player from "./player";
import { TeamTeam } from "./types";

function ClubProfile(props: TeamTeam) {
  return (
    <Detail
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
          <Action.OpenInBrowser
            url={`https://www.premierleague.com/clubs/${
              props.id
            }/${props.name.replace(/ /g, "-")}/overview`}
          />
          <Action.Push
            title="Squad"
            icon={Icon.Person}
            target={<Player club={props.club} />}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Club() {
  const season = useSeasons();
  const [selectedSeason, setSeason] = useState<string>(
    season.seasons[0]?.id.toString()
  );
  const club = useClubs(selectedSeason);

  return (
    <List
      throttle
      isLoading={season.loading || club.loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Season" onChange={setSeason}>
          <List.Dropdown.Section>
            {season.seasons.map((season) => {
              return (
                <List.Dropdown.Item
                  key={season.id}
                  value={season.id.toString()}
                  title={season.label}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {club.clubs.map((team) => {
        return (
          <List.Item
            key={team.id}
            title={team.name}
            subtitle={team.shortName}
            icon={{
              source: `https://resources.premierleague.com/premierleague/badges/${team.altIds.opta}.svg`,
              fallback: "default.png",
            }}
            accessories={[
              { text: team.grounds[0].name },
              { icon: "stadium.svg" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Club Profile"
                  target={<ClubProfile {...team} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
