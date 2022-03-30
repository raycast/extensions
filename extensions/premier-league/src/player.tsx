import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import json2md from "json2md";
import { useState } from "react";
import { usePlayers, useSeasons } from "./hooks";
import { PlayerContent } from "./types";

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function PlayerProfile(props: PlayerContent) {
  return (
    <Detail
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
            text={props.nationalTeam.country}
          />
          <Detail.Metadata.Label
            title="Date of Birth"
            text={props.birth.date.label}
          />
          <Detail.Metadata.Label title="Age" text={props.age} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Current Team"
            text={props.currentTeam?.club.name}
          />
          <Detail.Metadata.Label
            title="Previous Team"
            text={props.previousTeam?.club.name}
          />
          <Detail.Metadata.Label
            title="Position"
            text={props.info.positionInfo}
          />
        </Detail.Metadata>
      }
    />
  );
}

export default function Player() {
  const season = useSeasons();
  const [page, setPage] = useState<number>(0);
  const [selectedSeason, setSeason] = useState<string>(
    season.seasons[0]?.id.toString()
  );

  const player = usePlayers(selectedSeason, page);

  return (
    <List
      throttle
      isLoading={season.loading || player.loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Season" onChange={setSeason}>
          {season.seasons.map((s) => {
            return (
              <List.Dropdown.Item
                key={s.id}
                value={s.id.toString()}
                title={s.label}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {player.players.map((p) => {
        return (
          <List.Item
            key={p.id}
            title={p.name.display}
            subtitle={p.info.positionInfo}
            icon={{
              source: `https://resources.premierleague.com/premierleague/photos/players/40x40/${p.altIds.opta}.png`,
              fallback: "player-missing.png",
            }}
            accessories={[
              {
                text: p.nationalTeam.country,
              },
              {
                icon: getFlagEmoji(p.nationalTeam.isoCode.slice(0, 2)),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<PlayerProfile {...p} />}
                />
                <Action
                  title="Load More"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    setPage(page + 1);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
