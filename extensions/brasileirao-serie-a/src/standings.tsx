import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { useTable } from "./hooks";

export default function Standings() {
  const [table, isLoading] = useTable();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <List
      throttle
      // searchBarAccessory={
      //   <List.Dropdown tooltip="Filter by Season" value={selectedSeason} onChange={setSeason}>
      //     <List.Dropdown.Section>
      //       {seasons.map((season) => {
      //         return <List.Dropdown.Item key={season.id} value={season.id.toString()} title={season.label} />;
      //       })}
      //     </List.Dropdown.Section>
      //   </List.Dropdown>
      // }
      isLoading={isLoading}
      isShowingDetail={showDetails}
    >
      <List.Section>
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
              subtitle={team.name}
              keywords={[team.name, team.shortName, team.tla]}
              icon={{
                source: team.crest,
                fallback: "default.png",
              }}
              accessories={[{ text: entry.points.toString() }, { icon }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Stats" />
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
                      {/* {form && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Recent Results" />
                          {form.reverse().map((m) => {
                            return (
                              <List.Item.Detail.Metadata.Label
                                key={m.id}
                                title={`${m.teams[0].team.name} - ${m.teams[1].team.name}`}
                                text={`${m.teams[0].score} - ${m.teams[1].score}`}
                              />
                            );
                          })}
                        </>
                      )}
                      {next && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Next Fixture" />
                          <List.Item.Detail.Metadata.Label
                            title={`${next.teams[0].team.name} - ${next.teams[1].team.name}`}
                            text={convertToLocalTime(next.kickoff.label)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Stadium"
                            text={`${next.ground.name}, ${next.ground.city}`}
                          />
                        </>
                      )} */}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={showDetails ? "Hide details" : "Show details"}
                    icon={Icon.Sidebar}
                    onAction={() => setShowDetails((prev) => !prev)}
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
