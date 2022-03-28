import { Action, ActionPanel, List, Icon, Image, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import json2md from "json2md";
import CompetitionDropdown, {
  competitions,
} from "./components/competition_dropdown";
import ClubDetails from "./components/club";
import { getStandings } from "./api";
import { Standing } from "./types/standing";

export default function GetTables() {
  const [standing, setStandings] = useState<Standing[]>([]);
  const [competition, setCompetition] = useState<string>(competitions[0].value);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setStandings([]);
    setLoading(true);

    getStandings(competition).then((data) => {
      setStandings(data);
      setLoading(false);
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
      searchBarAccessory={<CompetitionDropdown onSelect={setCompetition} />}
      isLoading={loading}
    >
      {standing.map((table) => {
        let icon: Image.ImageLike = {
          source: Icon.Dot,
          tintColor: Color.SecondaryText,
        };

        if (table.position < table.previous_position) {
          icon = {
            source: Icon.ChevronUp,
            tintColor: Color.Green,
          };
        } else if (table.position > table.previous_position) {
          icon = {
            source: Icon.ChevronDown,
            tintColor: Color.Red,
          };
        }

        return (
          <List.Item
            key={table.team.id}
            title={`${table.position}. ${table.team.nickname}`}
            subtitle={table.team.shortname}
            accessories={[
              { text: `Played: ${table.played}` },
              { text: `Points: ${table.points}` },
              { icon },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Club Details"
                  icon={{
                    source: `https://assets.laliga.com/assets/2019/06/07/small/${table.team.slug}.png`,
                    fallback: "default.png",
                  }}
                  target={<ClubDetails slug={table.team.slug} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
