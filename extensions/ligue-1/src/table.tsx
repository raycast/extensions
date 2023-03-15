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

        if (team.ranking === "up") {
          icon = {
            source: Icon.ChevronUpSmall,
            tintColor: Color.Green,
          };
        } else if (team.ranking === "down") {
          icon = {
            source: Icon.ChevronDownSmall,
            tintColor: Color.Red,
          };
        }

        const accessories: List.Item.Accessory[] = [
          {
            text: {
              color: Color.PrimaryText,
              value: team.points,
            },
            icon,
            tooltip: "Points",
          },
        ];

        if (!showStats) {
          team.forms.reverse().forEach((form) => {
            let tintColor = Color.SecondaryText;
            if (form === "win") {
              tintColor = Color.Green;
            } else if (form === "lose") {
              tintColor = Color.Red;
            }

            accessories.unshift({
              icon: {
                source: Icon.CircleFilled,
                tintColor,
              },
            });
          });

          accessories.unshift(
            {
              icon: Icon.SoccerBall,
              text: team.played,
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
            key={team.position}
            icon={team.logo}
            title={team.position}
            subtitle={team.name}
            keywords={[team.name]}
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
                      text={team.played}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Won"
                      text={team.won}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Drawn"
                      text={team.drawn}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Lost"
                      text={team.lost}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals For"
                      text={team.goals_for}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals Against"
                      text={team.goals_against}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goal Difference"
                      text={team.goal_difference}
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
