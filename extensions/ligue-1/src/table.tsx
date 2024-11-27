import { List, Icon, Image, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import SeasonDropdown from "./components/season_dropdown";
import { getTable } from "./api";
import { Standing } from "./types";

export default function GetTables() {
  const [table, setTable] = useState<Standing[]>();
  const [competition, setCompetition] = useState<string>("");
  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    if (competition) {
      setTable(undefined);
      getTable(competition).then((data) => {
        setTable(data);
      });
    }
  }, [competition]);

  return (
    <List
      throttle
      isLoading={!table}
      searchBarAccessory={
        <SeasonDropdown selected={competition} onSelect={setCompetition} />
      }
      isShowingDetail={showStats}
    >
      {table?.map((team) => {
        let icon: Image.ImageLike = {
          source: Icon.Dot,
          tintColor: Color.SecondaryText,
        };

        if (team.rank < team.gameWeekStartingRank) {
          icon = {
            source: Icon.ChevronUpSmall,
            tintColor: Color.Green,
          };
        } else if (team.rank > team.gameWeekStartingRank) {
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
              text: `${team.forGoals} - ${team.againstGoals}`,
              tooltip: "Goals For - Goals Against",
            },
          );
        }

        return (
          <List.Item
            key={team.rank}
            icon={team.clubIdentity.assets.logo.small}
            title={team.clubIdentity.name}
            // subtitle={team.name}
            keywords={[team.clubIdentity.name, team.clubIdentity.shortName]}
            accessories={accessories}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Stats" />
                    {/* <List.Item.Detail.Metadata.Label
                      title="Previous Position"
                      text={team.previous_position}
                    /> */}
                    <List.Item.Detail.Metadata.Label
                      title="Played"
                      text={team.played.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Won"
                      text={team.wins.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Drawn"
                      text={team.draws.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Lost"
                      text={team.losses.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals For"
                      text={team.forGoals.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals Against"
                      text={team.againstGoals.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goal Difference"
                      text={team.goalsDifference.toString()}
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
