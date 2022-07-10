import { List, Icon, Image, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
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

        return (
          <List.Item
            key={team.team.id}
            title={team.position.toString()}
            subtitle={team.team.nickname}
            keywords={[team.team.nickname, team.team.shortname]}
            accessories={[{ text: team.points.toString() }, { icon }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Stats" />
                    <List.Item.Detail.Metadata.Label
                      title="Previous Position"
                      text={team.previous_position.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Played"
                      text={team.played.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Won"
                      text={team.won.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Drawn"
                      text={team.drawn.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Lost"
                      text={team.lost.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals For"
                      text={team.goals_for.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals Against"
                      text={team.goals_against.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goal Difference"
                      text={team.goal_difference.toString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
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
