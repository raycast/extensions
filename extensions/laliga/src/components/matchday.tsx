import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { format } from "date-fns";
import { Match } from "../types";

interface PropsType {
  name: string;
  matches: Match[];
  action: JSX.Element;
  format?: string;
}

export default function Matchday(props: PropsType) {
  const { name, matches } = props;
  return (
    <List.Section key={name} title={name}>
      {matches.map((match) => {
        let icon: Image.ImageLike = Icon.Clock;
        if (match.status.toLowerCase().includes("half")) {
          icon = { source: Icon.Livestream, tintColor: Color.Red };
        } else if (match.status === "FullTime") {
          icon = { source: Icon.CheckCircle, tintColor: Color.Green };
        } else if (match.time) {
          icon = Icon.Calendar;
        }

        const accessories: List.Item.Accessory[] = [
          { text: match.venue.name },
          {
            icon: {
              source: "stadium.svg",
              tintColor: Color.SecondaryText,
            },
          },
        ];

        const title = match.time
          ? format(new Date(match.date), props.format || "eee dd.MM.yyyy HH:mm")
          : "TBC";

        return (
          <List.Item
            key={match.id}
            title={title}
            subtitle={
              match.status === "PreMatch"
                ? `${match.home_team.nickname} - ${match.away_team.nickname}`
                : `${match.home_team.nickname} ${match.home_score} - ${match.away_score} ${match.away_team.nickname}`
            }
            icon={icon}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://www.laliga.com/en-GB/match/${match.slug}`}
                />
                {props.action}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
