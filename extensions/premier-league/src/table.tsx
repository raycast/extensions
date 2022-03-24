import { Action, ActionPanel, List, Icon, Image, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import json2md from "json2md";
import SeasonDropdown, { seasons } from "./components/season_dropdown";
import { getTables } from "./api";
import { Entry, Table } from "./types/table";

export default function GetTables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [season, setSeason] = useState<string>(seasons[0].value);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    setTables([]);
    setLoading(true);

    getTables(season).then((data) => {
      setTables(data);
      setLoading(false);
    });
  }, [season]);

  const club = (entry: Entry): json2md.DataObject => {
    const { overall, team, ground, form, next, startingPosition } = entry;

    const dataObject = [
      { h1: team.name },
      { h2: "Overview" },
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
      dataObject.push(
        { h2: "Next Fixture" },
        {
          p: [
            `**${next.teams[0].team.name} - ${next.teams[1].team.name}**`,
            `Time: ${next.kickoff.label}`,
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
      searchBarAccessory={<SeasonDropdown onSelect={setSeason} />}
      isLoading={loading}
      isShowingDetail={showDetails}
    >
      {tables.map((table) => {
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

              let accessoryIcon: Image.ImageLike = {
                source: Icon.Dot,
                tintColor: Color.SecondaryText,
              };

              if (position < startingPosition) {
                accessoryIcon = {
                  source: Icon.ChevronUp,
                  tintColor: Color.Green,
                };
              } else if (position > startingPosition) {
                accessoryIcon = {
                  source: Icon.ChevronDown,
                  tintColor: Color.Red,
                };
              }

              const props: Partial<List.Item.Props> = showDetails
                ? {
                    accessoryTitle: overall.points.toString(),
                    accessoryIcon,
                    detail: (
                      <List.Item.Detail markdown={json2md(club(entry))} />
                    ),
                  }
                : {
                    subtitle: team.club.abbr,
                    accessoryTitle: `Played: ${overall.played} Points: ${overall.points}`,
                  };

              if (!showDetails && next) {
                const nextTeam =
                  ground.id === next.ground.id ? next.teams[1] : next.teams[0];
                props.accessoryIcon = {
                  source: `https://resources.premierleague.com/premierleague/badges/${nextTeam.team.altIds.opta}.svg`,
                  fallback: "default.png",
                };
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
                        title={showDetails ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowDetails(!showDetails)}
                      />
                      <Action.OpenInBrowser
                        title="Visit Club Page"
                        url={`https://www.premierleague.com/clubs/${
                          team.id
                        }/${team.name.replace(/ /g, "-")}/overview`}
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
