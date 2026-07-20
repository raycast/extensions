import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import useStandings from "./hooks/useStandings";

export default function GetStandings() {
  const standings = useStandings();
  const [showDetails, setShowDetails] = useState<boolean>(false);

  return (
    <List isLoading={!standings} filtering={false} isShowingDetail={showDetails}>
      {standings?.map((table) => {
        return (
          <List.Item
            key={table.position}
            title={table.position.toString()}
            subtitle={table.team.name}
            icon={{
              source: `${table.team.crest}`,
              mask: Image.Mask.Circle,
              fallback: "default.png",
            }}
            accessories={[{ text: table.points.toString() }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Details" />
                    <List.Item.Detail.Metadata.Label title="Games Played" text={table.playedGames.toString()} />
                    <List.Item.Detail.Metadata.Label title="Won" text={table.won.toString()} />
                    <List.Item.Detail.Metadata.Label title="Drawn" text={table.draw.toString()} />
                    <List.Item.Detail.Metadata.Label title="Lost" text={table.lost.toString()} />
                    <List.Item.Detail.Metadata.Label title="Goals For" text={table.goalsFor.toString()} />
                    <List.Item.Detail.Metadata.Label title="Goals Against" text={table.goalsAgainst.toString()} />
                    <List.Item.Detail.Metadata.Label title="Goals Difference" text={table.goalDifference.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={showDetails ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  onAction={() => setShowDetails(!showDetails)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
