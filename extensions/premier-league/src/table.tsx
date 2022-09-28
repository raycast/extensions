import { Action, ActionPanel, List, Icon, Image, Color } from "@raycast/api";
import { useState } from "react";
import { useSeasons, useTables } from "./hooks";
import { convertToLocalTime } from "./utils";

export default function GetTables() {
  const seasons = useSeasons();

  const [selectedSeason, setSeason] = useState<string>(
    seasons[0]?.id.toString()
  );
  const [showStats, setShowStats] = useState<boolean>(false);

  const tables = useTables(selectedSeason);

  return (
    <List
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Season"
          value={selectedSeason}
          onChange={setSeason}
        >
          <List.Dropdown.Section>
            {seasons.map((season) => {
              return (
                <List.Dropdown.Item
                  key={season.id}
                  value={season.id.toString()}
                  title={season.label}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isLoading={!tables}
      isShowingDetail={showStats}
    >
      {tables?.map((table) => {
        return (
          <List.Section key={table.gameWeek}>
            {table.entries.map((entry) => {
              const {
                overall,
                team,
                position,
                ground,
                form,
                next,
                startingPosition,
              } = entry;

              let icon: Image.ImageLike = {
                source: Icon.Dot,
                tintColor: Color.SecondaryText,
              };

              if (position < startingPosition) {
                icon = {
                  source: Icon.ChevronUp,
                  tintColor: Color.Green,
                };
              } else if (position > startingPosition) {
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
                  keywords={[team.name, team.shortName, team.club.abbr]}
                  icon={{
                    source: `https://resources.premierleague.com/premierleague/badges/100/${team.altIds.opta}@x2.png`,
                    fallback: "default.png",
                  }}
                  accessories={[{ text: overall.points.toString() }, { icon }]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Stadium"
                            text={ground.name}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Capacity"
                            text={ground.capacity?.toString()}
                          />
                          <List.Item.Detail.Metadata.Separator />

                          <List.Item.Detail.Metadata.Label title="Stats" />
                          {startingPosition && (
                            <List.Item.Detail.Metadata.Label
                              title="Previous Position"
                              text={startingPosition.toString()}
                            />
                          )}
                          <List.Item.Detail.Metadata.Label
                            title="Played"
                            text={overall.played.toString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Won"
                            text={overall.won.toString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Drawn"
                            text={overall.drawn.toString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Lost"
                            text={overall.lost.toString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Goals For"
                            text={overall.goalsFor.toString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Goals Against"
                            text={overall.goalsAgainst.toString()}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Goal Difference"
                            text={overall.goalsDifference.toString()}
                          />
                          {form && (
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
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title={showStats ? "Hide Stats" : "Show Stats"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowStats(!showStats)}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
