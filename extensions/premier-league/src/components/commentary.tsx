import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMatchCommentary } from "../api";
import { Fixture } from "../types";

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
  const { data, isLoading, pagination, revalidate } = usePromise(
    (fixtureId) =>
      async ({ page = 0 }) => {
        return getMatchCommentary(fixtureId, page);
      },
    [props.match.id],
  );

  return (
    <List
      throttle
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={
        props.match.status === "C"
          ? `${props.title} | Match Commentary`
          : `${props.title} | Live Match Commentary`
      }
    >
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

        const subtitle = textLabelIcons.includes(event.type) ? "" : event.text;

        return (
          <List.Item
            key={event.id}
            title={title}
            subtitle={subtitle}
            icon={icon}
            keywords={[title, subtitle]}
            actions={
              <ActionPanel>
                {props.match.status === "L" && (
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={revalidate}
                  />
                )}
                <Action.OpenInBrowser
                  url={`https://www.premierleague.com/match/${props.match.id}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
