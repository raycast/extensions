import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { useSeasons, useTable } from "./hooks";

export default function Standings() {
  const [currentSeason, seasons, setCurrentSeason] = useSeasons();
  const [table, isLoading] = useTable(currentSeason);
  const [showStats, setshowStats] = useState(false);

  return (
    <List
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Select Season" value={currentSeason} onChange={setCurrentSeason}>
          <List.Dropdown.Section>
            {seasons.map((season) => {
              return <List.Dropdown.Item key={season} value={season} title={season} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isLoading={isLoading}
      isShowingDetail={showStats}
    >
      <List.Section title="Club">
        {table.map((entry) => {
          const { team, position, previousPosition } = entry;

          let icon: Image.ImageLike = {
            source: Icon.Dot,
            tintColor: Color.SecondaryText,
          };

          if (previousPosition && position < previousPosition) {
            icon = {
              source: Icon.ChevronUp,
              tintColor: Color.Green,
            };
          } else if (previousPosition && position > previousPosition) {
            icon = {
              source: Icon.ChevronDown,
              tintColor: Color.Red,
            };
          }

          return (
            <List.Item
              key={position}
              title={position.toString()}
              subtitle={team.shortName}
              keywords={[team.name, team.shortName]}
              icon={{
                source: team.crest,
                fallback: "default.png",
              }}
              accessories={[{ text: entry.points.toString() }, { icon }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {previousPosition && (
                        <List.Item.Detail.Metadata.Label title="Previous Position" text={previousPosition.toString()} />
                      )}
                      <List.Item.Detail.Metadata.Label title="Played" text={entry.playedGames.toString()} />
                      <List.Item.Detail.Metadata.Label title="Won" text={entry.won.toString()} />
                      <List.Item.Detail.Metadata.Label title="Drawn" text={entry.draw.toString()} />
                      <List.Item.Detail.Metadata.Label title="Lost" text={entry.lost.toString()} />
                      <List.Item.Detail.Metadata.Label title="Goals For" text={entry.goalsFor.toString()} />
                      <List.Item.Detail.Metadata.Label title="Goals Against" text={entry.goalsAgainst.toString()} />
                      <List.Item.Detail.Metadata.Label title="Goal Difference" text={entry.goalDifference.toString()} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={showStats ? "Hide Stats" : "Show Stats"}
                    icon={Icon.Sidebar}
                    onAction={() => setshowStats((prev) => !prev)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
