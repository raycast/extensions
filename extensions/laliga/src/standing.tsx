import { List, Icon, Image, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import json2md from "json2md";
import CompetitionDropdown, {
  competitions,
} from "./components/competition_dropdown";
import { getStandings } from "./api";
import { Standing } from "./types";

export default function GetTables() {
  const [standing, setStandings] = useState<Standing[]>();
  const [competition, setCompetition] = useState<string>(competitions[0].value);
  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    setStandings(undefined);
    getStandings(competition).then((data) => {
      setStandings(data);
    });
  }, [competition]);

  const club = (standing: Standing): json2md.DataObject => {
    return [
      { h1: standing.team.name },
      { h2: "Stats" },
      {
        p: [
          `Previous Position: ${standing.previous_position}`,
          `Played: ${standing.played}`,
          `Won: ${standing.won}`,
          `Drawn: ${standing.drawn}`,
          `Lost: ${standing.lost}`,
          `Goals For: ${standing.goals_for}`,
          `Goals Against: ${standing.goals_against}`,
          `Goal Difference: ${standing.goal_difference}`,
        ],
      },
    ];
  };

  return (
    <List
      throttle
      isLoading={!standing}
      searchBarAccessory={
        <CompetitionDropdown selected={competition} onSelect={setCompetition} />
      }
      isShowingDetail={showStats}
    >
      {standing?.map((team) => {
        let icon: Image.ImageLike = {
          source: Icon.Dot,
          tintColor: Color.SecondaryText,
        };

        if (team.position < team.previous_position) {
          icon = {
            source: Icon.ChevronUp,
            tintColor: Color.Green,
          };
        } else if (team.position > team.previous_position) {
          icon = {
            source: Icon.ChevronDown,
            tintColor: Color.Red,
          };
        }

        const props: Partial<List.Item.Props> = showStats
          ? {
              detail: <List.Item.Detail markdown={json2md(club(team))} />,
              accessories: [{ text: team.points.toString() }, { icon }],
            }
          : {
              subtitle: team.team.shortname,
              accessories: [
                { text: `Played: ${team.played}` },
                { text: `Points: ${team.points}` },
                { icon },
              ],
            };

        return (
          <List.Item
            key={team.team.id}
            title={`${team.position}. ${team.team.nickname}`}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Show Stats"
                  icon={Icon.Sidebar}
                  onAction={() => {
                    setShowStats(!showStats);
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
