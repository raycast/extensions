import { List, Icon, Image, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import CompetitionDropdown from "./components/competition_dropdown";
import { getStandings } from "./api";
import { Standing } from "./types";

export default function GetTables() {
  const [standing, setStandings] = useState<Standing[]>();
  const [competition, setCompetition] = useState<string>("");
  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    if (competition) {
      setStandings(undefined);
      getStandings(competition).then((data) => {
        setStandings(data);
      });
    }
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
            source: Icon.ChevronUpSmall,
            tintColor: Color.Green,
          };
        } else if (team.position > team.previous_position) {
          icon = {
            source: Icon.ChevronDownSmall,
            tintColor: Color.Red,
          };
        }

        const accessories: List.Item.Accessory[] = [
          {
            text: {
              color: Color.PrimaryText,
              value: team.points.toString(),
            },
            icon,
            tooltip: "Points",
          },
        ];

        if (!showStats) {
          accessories.unshift(
            {
              icon: Icon.SoccerBall,
              text: team.played.toString(),
              tooltip: "Played",
            },
            {
              icon: Icon.Goal,
              text: `${team.goals_for} - ${team.goals_against}`,
              tooltip: "Goals For - Goals Against",
            }
          );
        }

        return (
          <List.Item
            key={team.team.id}
            icon={team.team.shield.url}
            title={team.position.toString()}
            subtitle={team.team.nickname}
            keywords={[team.team.nickname, team.team.shortname]}
            accessories={accessories}
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
