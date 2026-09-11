import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMatch, getMatchCommentary, getMatchOfficials } from "../api";
import { Fixture } from "../types";
import {
  convertISOToLocalTime,
  livePeriods,
  getMatchStatusIcon,
} from "../utils";

const iconMap: Record<string, string> = {
  "end 1": "time-half",
  "end 2": "time-full",
  goal: "goal",
  "own goal": "goal",
  "penalty goal": "goal",
  "red card": "card-red",
  "secondyellow card": "card-yellow-red",
  substitution: "sub-on-off",
  "yellow card": "card-yellow",
};

const transparentIcons = ["whistle", "goal", "time-full", "time-half"];
const textLabelIcons = ["end 14", "lineup", "start"];

export default function MatchCommentary(props: {
  match: Fixture;
  title: string;
}) {
  const { data: fixture, revalidate: refetch } = usePromise(getMatch, [
    props.match.matchId,
  ]);
  const { data, isLoading, pagination, revalidate } = usePromise(
    (matchId) =>
      async ({ cursor }) => {
        return getMatchCommentary(matchId, cursor);
      },
    [props.match.matchId],
  );

  const { data: referee } = usePromise(getMatchOfficials, [
    props.match.matchId,
  ]);

  const navigationTitle =
    !fixture || fixture.period === "PreMatch"
      ? props.title
      : `${fixture.homeTeam.name} ${fixture.homeTeam.score} - ${fixture.awayTeam.score} ${fixture.awayTeam.name}`;

  const accessories: List.Item.Accessory[] = [];

  if (fixture?.attendance) {
    accessories.push({
      text: fixture?.attendance?.toString(),
      tooltip: "Attendance",
      icon: Icon.TwoPeople,
    });
  }

  if (referee?.matchOfficials.length) {
    const mainReferee = referee.matchOfficials.find(
      (o) => o.type === "Referee",
    );
    const varReferee = referee.matchOfficials.find(
      (o) => o.type === "Video Assistant Referee",
    );
    accessories.push(
      {
        text: mainReferee?.official.name,
        tooltip: mainReferee?.type,
        icon: Icon.Stopwatch,
      },
      {
        text: varReferee?.official.name,
        tooltip: varReferee?.type,
        icon: Icon.Video,
      },
    );
  }

  if (fixture?.period === "PreMatch") {
    accessories.push({
      date: new Date(Number(fixture?.kickoff)),
    });
  }

  const subtitle = livePeriods.includes(fixture?.period || "")
    ? "Live Match Commentary"
    : "Match Commentary";

  const RefreshMatch = () => (
    <Action
      title="Refresh"
      icon={Icon.RotateClockwise}
      onAction={() => {
        refetch();
        revalidate();
      }}
    />
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`${navigationTitle} | ${subtitle}`}
    >
      {fixture && (
        <List.Item
          title={
            convertISOToLocalTime(
              fixture.kickoff,
              fixture.kickoffTimezone,
              "HH:mm",
            ) || "TBC"
          }
          subtitle={fixture.ground}
          icon={getMatchStatusIcon(fixture)}
          accessories={accessories}
          actions={
            <ActionPanel>
              {livePeriods.includes(fixture.period) && <RefreshMatch />}
              <Action.OpenInBrowser
                url={`https://www.premierleague.com/en/match/${props.match.matchId}?tab=commentary`}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section title={subtitle}>
        {data?.map((event, idx) => {
          const filename = iconMap[event.type] || "whistle";
          const icon: Image.ImageLike = transparentIcons.includes(filename)
            ? {
                source: `match/${filename}.svg`,
                tintColor:
                  event.type === "own goal" ? Color.Red : Color.PrimaryText,
              }
            : `match/${filename}.svg`;

          const title = textLabelIcons.includes(event.type)
            ? event.comment
            : event.time;

          const subtitle = textLabelIcons.includes(event.type)
            ? ""
            : event.comment;

          return (
            <List.Item
              key={idx}
              title={title}
              subtitle={subtitle}
              icon={icon}
              keywords={[title, subtitle]}
              actions={
                <ActionPanel>
                  {livePeriods.includes(fixture?.period || "") && (
                    <RefreshMatch />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
