import { Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getTable } from "./api";
import SeasonDropdown from "./components/season_dropdown";

export default function GetTables() {
  const [competition, setCompetition] = useState<string>("");

  const { data: table, isLoading } = usePromise(
    async (competition) => (competition ? await getTable(competition) : []),
    [competition],
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarAccessory={
        <SeasonDropdown selected={competition} onSelect={setCompetition} />
      }
      isShowingDetail={true}
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
            tooltip: "Points",
          },
          {
            icon,
          },
        ];

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
                    <List.Item.Detail.Metadata.Separator />
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
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Form">
                      {team.seasonResults.map((result, idx) => {
                        let color = Color.SecondaryText;
                        if (result.resultLetter === "l") {
                          color = Color.Red;
                        } else if (result.resultLetter === "w") {
                          color = Color.Green;
                        }

                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={idx}
                            text={result.resultLetter.toUpperCase()}
                            color={color}
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
