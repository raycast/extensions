import { Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getTables } from "./api";
import SearchBarSeason from "./components/searchbar_season";
import { convertToLocalTime, getClubLogo } from "./utils";

const qualificationMap: Record<string, string> = {
  EU_CL: "UEFA Champions League",
  EU_EL: "UEFA Europa League",
  EU_ECL: "UEFA Conference League",
  EN_CH: "EFL Championship",
};

const qualificationColor: Record<string, string> = {
  EU_CL: Color.Blue,
  EU_EL: Color.Orange,
  EU_ECL: Color.Green,
  EN_CH: Color.Red,
};

const annotationMap: Record<string, string> = {
  Q: "Qualification",
  R: "Relegation",
  PD: "Points Deduction",
};

export default function EPLTables() {
  const [seasonId, setSeasonId] = useState<string>();

  const { data: tables, isLoading } = usePromise(
    async (season) => {
      return season ? await getTables(season) : [];
    },
    [seasonId],
  );

  return (
    <List
      throttle
      searchBarAccessory={
        <SearchBarSeason selected={seasonId} onSelect={setSeasonId} />
      }
      isLoading={isLoading}
      isShowingDetail={true}
    >
      {tables?.map((table) => {
        const isEnded = table.entries.every((e) => e.overall.played === 38);

        return (
          <List.Section key={table.gameWeek}>
            {table.entries.map((entry) => {
              const {
                overall,
                team,
                position,
                form,
                next,
                startingPosition,
                annotations,
              } = entry;

              let icon: Image.ImageLike | undefined;

              let accessories: List.Item.Accessory[];
              if (isEnded) {
                if (position === 1) {
                  icon = {
                    source: Icon.Trophy,
                    tintColor: Color.Green,
                  };
                }

                accessories = [
                  {
                    text: {
                      color: Color.PrimaryText,
                      value: overall.points.toString(),
                    },
                    icon,
                  },
                ];
              } else {
                if (position < startingPosition) {
                  icon = {
                    source: Icon.ChevronUpSmall,
                    tintColor: Color.Green,
                  };
                } else if (position > startingPosition) {
                  icon = {
                    source: Icon.ChevronDownSmall,
                    tintColor: Color.Red,
                  };
                } else {
                  icon = {
                    source: Icon.Dot,
                  };
                }

                accessories = [
                  {
                    text: {
                      color: Color.PrimaryText,
                      value: overall.points.toString(),
                    },
                  },
                  {
                    icon,
                    tooltip: `Previous Position: ${startingPosition}`,
                  },
                ];
              }

              return (
                <List.Item
                  key={position}
                  title={position.toString()}
                  subtitle={team.shortName}
                  keywords={[team.name, team.shortName, team.club.abbr]}
                  icon={{
                    source: getClubLogo(team.altIds.opta),
                    fallback: "default.png",
                  }}
                  accessories={accessories}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
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
                          <List.Item.Detail.Metadata.Separator />
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

                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.TagList title="Form">
                            {form?.map((m) => {
                              const isHome =
                                m.teams[0].team.shortName === team.shortName;

                              let isWinner;
                              if (isHome) {
                                isWinner = m.teams[0].score > m.teams[1].score;
                              } else {
                                isWinner = m.teams[0].score < m.teams[1].score;
                              }

                              let color;
                              let text;
                              if (m.outcome !== "D") {
                                color = isWinner ? Color.Green : Color.Red;
                                text = isWinner ? "W" : "L";
                              } else {
                                color = Color.SecondaryText;
                                text = "D";
                              }

                              return (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={m.id}
                                  text={text}
                                  color={color}
                                />
                              );
                            })}
                          </List.Item.Detail.Metadata.TagList>
                          {Array.isArray(annotations) &&
                            annotations.length &&
                            annotations.map((annotation) => {
                              return annotation.type === "Q" ? (
                                <List.Item.Detail.Metadata.TagList
                                  key={annotation.type}
                                  title={annotationMap[annotation.type]}
                                >
                                  <List.Item.Detail.Metadata.TagList.Item
                                    text={
                                      qualificationMap[annotation.description]
                                    }
                                    color={
                                      qualificationColor[annotation.description]
                                    }
                                  />
                                </List.Item.Detail.Metadata.TagList>
                              ) : (
                                <List.Item.Detail.Metadata.Label
                                  key={annotation.type}
                                  title={annotationMap[annotation.type]}
                                  text={annotation.description}
                                />
                              );
                            })}
                          {next && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label
                                title="Next Fixture"
                                text={`${next.teams[0].team.name} - ${next.teams[1].team.name}`}
                              />
                              <List.Item.Detail.Metadata.Label
                                title="Kick Off"
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
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
