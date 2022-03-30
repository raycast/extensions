import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import json2md from "json2md";
import { useManagers, useSeasons } from "./hooks";
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
  const season = useSeasons();
  const manager = useManagers(season.seasons[0]?.id.toString());

  return (
    <List throttle isLoading={season.loading || manager.loading}>
      {manager.managers.map((p) => {
        return (
          <List.Item
            key={p.id}
            title={p.name.display}
            subtitle={p.currentTeam?.name}
            icon={{
              source: `https://resources.premierleague.com/premierleague/photos/players/40x40/${p.altIds.opta}.png`,
              fallback: "player-missing.png",
            }}
            accessories={[
              {
                text: p.birth.country.country,
              },
              {
                icon: getFlagEmoji(p.birth.country.isoCode.slice(0, 2)),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<PlayerProfile {...p} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
