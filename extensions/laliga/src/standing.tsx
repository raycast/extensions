import { Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import { useState } from "react";
import { getPrevNextMatches, getStandings } from "./api";
import CompetitionDropdown from "./components/competition_dropdown";
import { Match } from "./types";

function PreviousNextMatches(props: { team: string; previous?: Match[]; next?: Match[] }) {
  const { team, previous, next } = props;
  const metadata = [];

  if (previous) {
    metadata.push(<List.Item.Detail.Metadata.Separator key="prev-separator" />);

    const form = previous.map((match) => {
      let text = "";
      let color = Color.SecondaryText;
      if (match.home_score === match.away_score) {
        text = "D";
      } else if (match.home_score < match.away_score) {
        text = match.home_team.slug === team ? "L" : "W";
        color = text === "L" ? Color.Red : Color.Green;
      } else {
        text = match.home_team.slug === team ? "W" : "L";
        color = text === "L" ? Color.Red : Color.Green;
      }
      return <List.Item.Detail.Metadata.TagList.Item key={match.id} text={text} color={color} />;
    });

    // latest match is in the right
    metadata.push(<List.Item.Detail.Metadata.TagList key="form" title="Form" children={form.reverse()} />);
  }

  if (next?.length) {
    metadata.push(
      <List.Item.Detail.Metadata.Separator key="next-separator" />,
      <List.Item.Detail.Metadata.Label
        key="next"
        title="Next Fixture"
        text={`${next[0].home_team.nickname} - ${next[0].away_team.nickname}`}
      />,
      <List.Item.Detail.Metadata.Label
        key="kickoff"
        title="Kick Off"
        text={next[0].date ? formatDate(next[0].date, "eee dd.MM.yyyy HH:mm") : "TBC"}
      />,
      <List.Item.Detail.Metadata.Label
        key="stadium"
        title="Stadium"
        text={`${next[0].venue.name}, ${next[0].venue.city}`}
      />,
    );
  }

  return metadata;
}

export default function GetTables() {
  const [competition, setCompetition] = useState<string>("");
  const [team, setTeam] = useState<string | null>(null);

  const { data: standing, isLoading } = usePromise(
    async (competition) => {
      return competition ? await getStandings(competition) : [];
    },
    [competition],
  );

  const isEnded = standing?.every((t) => t.played === 38);

  const { data, isLoading: isLoadingPrevNext } = usePromise(
    async (team) => {
      return team ? await getPrevNextMatches(team, competition) : undefined;
    },
    [team],
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarAccessory={<CompetitionDropdown selected={competition} onSelect={setCompetition} />}
      isShowingDetail={true}
      onSelectionChange={setTeam}
    >
      {standing?.map((team) => {
        let icon: Image.ImageLike | undefined;

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
        } else if (isEnded) {
          icon =
            team.position === 1
              ? {
                  source: Icon.Trophy,
                  tintColor: Color.Orange,
                }
              : undefined;
        } else {
          icon = {
            source: Icon.Dot,
          };
        }

        const accessories: List.Item.Accessory[] = isEnded
          ? [
              {
                text: {
                  color: Color.PrimaryText,
                  value: team.points.toString(),
                },
                icon,
              },
            ]
          : [
              {
                text: {
                  color: Color.PrimaryText,
                  value: team.points.toString(),
                },
              },
              {
                icon,
                tooltip: `Previous Position: ${team.previous_position}`,
              },
            ];

        return (
          <List.Item
            id={team.team.slug}
            key={team.team.slug}
            icon={team.team.shield.url}
            title={team.position.toString()}
            subtitle={team.team.nickname}
            keywords={[team.team.nickname, team.team.shortname]}
            accessories={accessories}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {team.qualify && (
                      <List.Item.Detail.Metadata.TagList title="Qualify">
                        <List.Item.Detail.Metadata.TagList.Item text={team.qualify.name} color={team.qualify.color} />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Label title="Played" text={team.played.toString()} />
                    <List.Item.Detail.Metadata.Label title="Won" text={team.won.toString()} />
                    <List.Item.Detail.Metadata.Label title="Drawn" text={team.drawn.toString()} />
                    <List.Item.Detail.Metadata.Label title="Lost" text={team.lost.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Goals For" text={team.goals_for.toString()} />
                    <List.Item.Detail.Metadata.Label title="Goals Against" text={team.goals_against.toString()} />
                    <List.Item.Detail.Metadata.Label title="Goal Difference" text={team.goal_difference.toString()} />

                    {!isLoadingPrevNext && (
                      <PreviousNextMatches
                        team={team.team.slug}
                        previous={data?.previous_matches}
                        next={data?.next_matches}
                      />
                    )}
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
