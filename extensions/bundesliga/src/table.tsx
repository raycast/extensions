import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import json2md from "json2md";
import { useTable } from "./hooks";
import { Entry } from "./types/firebase";

export default function Table() {
  const [competition, setCompetition] = useState<string>("bundesliga");
  const table = useTable(competition);
  const [showStats, setShowStats] = useState<boolean>(false);

  const clubStats = (entry: Entry): json2md.DataObject => {
    return [
      { h1: entry.club.nameFull },
      { h2: "Stats" },
      {
        p: [
          `Played: ${entry.gamesPlayed}`,
          `Won: ${entry.wins}`,
          `Drawn: ${entry.draws}`,
          `Lost: ${entry.losses}`,
          `Goals For: ${entry.goalsScored}`,
          `Goals Against: ${entry.goalsAgainst}`,
          `Goal Difference: ${entry.goalDifference}`,
        ],
      },
    ];
  };

  return (
    <List
      throttle
      isLoading={!table}
      isShowingDetail={showStats}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Competition"
          value={competition}
          onChange={setCompetition}
        >
          <List.Dropdown.Item title="Bundesliga" value="bundesliga" />
          <List.Dropdown.Item title="2. Bundesliga" value="2bundesliga" />
        </List.Dropdown>
      }
    >
      {table?.map((entry) => {
        let icon: Image.ImageLike = {
          source: Icon.Dot,
          tintColor: Color.SecondaryText,
        };

        if (entry.tendency === "UP") {
          icon = {
            source: Icon.ChevronUp,
            tintColor: Color.Green,
          };
        } else if (entry.tendency === "DOWN") {
          icon = {
            source: Icon.ChevronDown,
            tintColor: Color.Red,
          };
        }

        const props: Partial<List.Item.Props> = showStats
          ? {
              accessories: [{ text: entry.points.toString() }, { icon }],
              detail: <List.Item.Detail markdown={json2md(clubStats(entry))} />,
            }
          : {
              accessories: [
                { text: `Played: ${entry.gamesPlayed}` },
                { text: `Points: ${entry.points}` },
                { icon },
              ],
            };

        return (
          <List.Item
            key={entry.rank}
            title={`${entry.rank}. ${entry.club.nameFull}`}
            icon={{
              source: entry.club.logoUrl,
              fallback: "default_clublogo.svg",
            }}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Show Stats"
                  icon={Icon.Sidebar}
                  onAction={() => setShowStats(!showStats)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
