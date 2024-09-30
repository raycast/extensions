import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getFixture, getMatchCommentary } from "../api";
import { Fixture } from "../types";
import { convertToLocalTime, getMatchStatusIcon } from "../utils";

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
  const { data: fixture, revalidate: refetch } = usePromise(getFixture, [
    props.match.id,
  ]);
  const { data, isLoading, pagination, revalidate } = usePromise(
    (fixtureId) =>
      async ({ page = 0 }) => {
        return getMatchCommentary(fixtureId, page);
      },
    [props.match.id],
  );

  const navigationTitle =
    !fixture || fixture.status === "U"
      ? props.title
      : `${fixture.teams[0].team.name} ${fixture.teams[0].score} - ${fixture.teams[1].score} ${fixture.teams[1].team.name}`;

  const accessories: List.Item.Accessory[] = [];

  if (fixture?.attendance) {
    accessories.push({
      text: fixture?.attendance?.toString(),
      tooltip: "Attendance",
      icon: Icon.TwoPeople,
    });
  }

  if (fixture?.matchOfficials.length) {
    const referee = fixture?.matchOfficials.find((o) => o.role === "MAIN");
    const varReferee = fixture?.matchOfficials.find((o) => o.role === "VAR");
    accessories.push(
      {
        text: referee?.name.display,
        tooltip: "Referee",
        icon: Icon.Stopwatch,
      },
      {
        text: varReferee?.name.display,
        tooltip: "VAR",
        icon: Icon.Video,
      },
    );
  }

  if (fixture?.status === "U") {
    accessories.push({
      date: new Date(Number(fixture?.kickoff.millis)),
    });
  }

  const subtitle =
    fixture?.status === "L" ? "Live Match Commentary" : "Match Commentary";

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
          title={convertToLocalTime(fixture.kickoff.label, "HH:mm") || "TBC"}
          subtitle={`${fixture.ground.name}, ${fixture.ground.city}`}
          icon={getMatchStatusIcon(fixture)}
          accessories={accessories}
          actions={
            <ActionPanel>
              {props.match.status === "L" && <RefreshMatch />}
              <Action.OpenInBrowser
                url={`https://www.premierleague.com/match/${props.match.id}`}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section title={subtitle}>
        {data?.map((event) => {
          const filename = iconMap[event.type] || "whistle";
          const icon: Image.ImageLike = transparentIcons.includes(filename)
            ? {
                source: `match/${filename}.svg`,
                tintColor:
                  event.type === "own goal" ? Color.Red : Color.PrimaryText,
              }
            : `match/${filename}.svg`;

          const title = textLabelIcons.includes(event.type)
            ? event.text
            : `${event.time?.label}'`;

          const subtitle = textLabelIcons.includes(event.type)
            ? ""
            : event.text;

          return (
            <List.Item
              key={event.id}
              title={title}
              subtitle={subtitle}
              icon={icon}
              keywords={[title, subtitle]}
              actions={
                <ActionPanel>
                  {props.match.status === "L" && <RefreshMatch />}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
