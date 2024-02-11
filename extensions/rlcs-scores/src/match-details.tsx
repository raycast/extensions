import { Color, Icon, List } from "@raycast/api";
import { z } from "zod";
import { matchSchema } from "./schemas/match.schema";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";

dayjs.extend(durationPlugin);

const MatchDetails = ({ match }: { match: z.infer<typeof matchSchema> }) => {
  if (!match.games) {
    const isPlayed = match.blue?.winner || match.orange?.winner;
    return (
      <List>
        <List.EmptyView
          icon={isPlayed ? Icon.LivestreamDisabled : Icon.BoltDisabled}
          title={isPlayed ? "Couldn't find any record for games" : "Match hasn't been played yet"}
        />
      </List>
    );
  }

  return (
    <List isShowingDetail>
      <List.Item
        title="Overall player stats"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.TagList title="Team blue">
                  <List.Item.Detail.Metadata.TagList.Item text={`${match.blue?.team.team.name}`} color={Color.Blue} />
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label title="Shots" text={`${match.blue?.team.stats.core.shots}`} />
                <List.Item.Detail.Metadata.Label title="Goals" text={`${match.blue?.team.stats.core.goals}`} />
                <List.Item.Detail.Metadata.Label title="Saves" text={`${match.blue?.team.stats.core.saves}`} />
                <List.Item.Detail.Metadata.Label title="Assists" text={`${match.blue?.team.stats.core.assists}`} />
                <List.Item.Detail.Metadata.Label title="Score" text={`${match.blue?.team.stats.core.score}`} />
                <List.Item.Detail.Metadata.Label
                  title="Shooting percentage"
                  text={`${match.blue?.team.stats.core.shootingPercentage.toFixed(0)} %`}
                />

                <List.Item.Detail.Metadata.Separator />

                <List.Item.Detail.Metadata.TagList title="Team orange">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`${match.orange?.team.team.name}`}
                    color={Color.Orange}
                  />
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label title="Shots" text={`${match.orange?.team.stats.core.shots}`} />
                <List.Item.Detail.Metadata.Label title="Goals" text={`${match.orange?.team.stats.core.goals}`} />
                <List.Item.Detail.Metadata.Label title="Saves" text={`${match.orange?.team.stats.core.saves}`} />
                <List.Item.Detail.Metadata.Label title="Assists" text={`${match.orange?.team.stats.core.assists}`} />
                <List.Item.Detail.Metadata.Label title="Score" text={`${match.orange?.team.stats.core.score}`} />
                <List.Item.Detail.Metadata.Label
                  title="Shooting percentage"
                  text={`${match.orange?.team.stats.core.shootingPercentage.toFixed(0)} %`}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />

      {match.games?.map((game, index) => {
        const winner = game.blue > game.orange ? match.blue?.team?.team : match.orange?.team?.team;
        return (
          <List.Item
            key={game._id}
            title={`Game ${index + 1}`}
            accessories={[
              {
                text: {
                  value: `${winner.name}`,
                  color: game.blue > game.orange ? Color.Blue : Color.Orange,
                },
                icon: { source: winner.image || "" },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Score">
                      <List.Item.Detail.Metadata.TagList.Item text={`${game.blue}`} color={Color.Blue} />
                      <List.Item.Detail.Metadata.TagList.Item text={`:`} color="rgb(0, 0, 0, 0)" />
                      <List.Item.Detail.Metadata.TagList.Item text={`${game.orange}`} color={Color.Orange} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={`${dayjs.duration(game.duration, "seconds").format("m [min] ss")}${game.overtime ? " (OT)" : ""}`}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Replay"
                      target={`https://ballchasing.com/replay/${game.ballchasing}`}
                      text="Ballchasing.com"
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
};

export { MatchDetails };
