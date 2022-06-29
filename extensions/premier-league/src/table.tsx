import { Action, ActionPanel, List, Icon, Image, Color } from "@raycast/api";
import { useState } from "react";
import json2md from "json2md";
import { Entry } from "./types";
import { useSeasons, useTables } from "./hooks";
import { convertToLocalTime } from "./utils";

export default function GetTables() {
  const seasons = useSeasons();

  const [selectedSeason, setSeason] = useState<string>(
    seasons[0]?.id.toString()
  );
  const [showStats, setShowStats] = useState<boolean>(false);

  const tables = useTables(selectedSeason);

  const club = (entry: Entry): json2md.DataObject => {
    const { overall, team, ground, form, next, startingPosition } = entry;

    const dataObject = [
      { h1: team.name },
      { p: ground.name ? `Stadium: ${ground.name}, **${ground.city}**` : "" },
      { p: ground.capacity ? `Capacity: ${ground.capacity}` : "" },
      { h2: "Stats" },
      {
        p: [
          `Previous Position: ${startingPosition}`,
          `Played: ${overall.played}`,
          `Won: ${overall.won}`,
          `Drawn: ${overall.drawn}`,
          `Lost: ${overall.lost}`,
          `Goals For: ${overall.goalsFor}`,
          `Goals Against: ${overall.goalsAgainst}`,
          `Goal Difference: ${overall.goalsDifference}`,
        ],
      },
      { h2: "Recent Results" },
      {
        ul: form.reverse().map((m) => {
          return `${m.teams[0].team.name} ${m.teams[0].score} - ${m.teams[1].score} ${m.teams[1].team.name}`;
        }),
      },
    ];

    if (next) {
      const time = convertToLocalTime(next.kickoff.label);

      dataObject.push(
        { h2: "Next Fixture" },
        {
          p: [
            `**${next.teams[0].team.name} - ${next.teams[1].team.name}**`,
            `Time: ${time}`,
            `Stadium: ${next.ground.name}, **${next.ground.city}**`,
          ],
        }
      );
    }

    return dataObject;
  };

  return (
    <List
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Season"
          value={selectedSeason}
          onChange={setSeason}
        >
          <List.Dropdown.Section>
            {seasons.map((season) => {
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
      isLoading={!tables}
      isShowingDetail={showStats}
    >
      {tables?.map((table) => {
        return (
          <List.Section key={table.gameWeek}>
            {table.entries.map((entry) => {
              const {
                overall,
                team,
                position,
                ground,
                next,
                startingPosition,
              } = entry;

              let icon: Image.ImageLike = {
                source: Icon.Dot,
                tintColor: Color.SecondaryText,
              };

              if (position < startingPosition) {
                icon = {
                  source: Icon.ChevronUp,
                  tintColor: Color.Green,
                };
              } else if (position > startingPosition) {
                icon = {
                  source: Icon.ChevronDown,
                  tintColor: Color.Red,
                };
              }

              const props: Partial<List.Item.Props> = showStats
                ? {
                    accessories: [
                      { text: overall.points.toString() },
                      { icon },
                    ],
                    detail: (
                      <List.Item.Detail markdown={json2md(club(entry))} />
                    ),
                  }
                : {
                    subtitle: team.club.abbr,
                    accessories: [
                      { text: `Played: ${overall.played}` },
                      { text: `Points: ${overall.points}` },
                    ],
                  };

              if (!showStats && next) {
                const nextTeam =
                  ground.id === next.ground.id ? next.teams[1] : next.teams[0];

                props.accessories?.push({
                  icon: {
                    source: `https://resources.premierleague.com/premierleague/badges/${nextTeam.team.altIds.opta}.svg`,
                    fallback: "default.png",
                  },
                  tooltip: `${next.teams[0].team.shortName} - ${next.teams[1].team.shortName}`,
                });
              }

              return (
                <List.Item
                  key={position}
                  title={`${position}. ${team.name}`}
                  icon={{
                    source: `https://resources.premierleague.com/premierleague/badges/${team.altIds.opta}.svg`,
                    fallback: "default.png",
                  }}
                  {...props}
                  actions={
                    <ActionPanel>
                      <Action
                        title={showStats ? "Hide Stats" : "Show Stats"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowStats(!showStats)}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
