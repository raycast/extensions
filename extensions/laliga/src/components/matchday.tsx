import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { formatDate } from "date-fns";
import { Match } from "../types";
import MatchComments from "./comment";
import MatchLineups from "./lineup";

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

        const title = match.date ? formatDate(match.date, props.format || "eee dd.MM.yyyy HH:mm") : "TBC";

        const matchName =
          match.status === "PreMatch" || match.status === "Canceled"
            ? `${match.home_team.nickname} - ${match.away_team.nickname}`
            : `${match.home_team.nickname} ${match.home_score} - ${match.away_score} ${match.away_team.nickname}`;

        return (
          <List.Item
            key={match.id}
            title={title}
            subtitle={matchName}
            icon={icon}
            accessories={accessories}
            keywords={[
              match.home_team.name,
              match.home_team.shortname,
              match.home_team.nickname,
              match.away_team.name,
              match.away_team.shortname,
              match.away_team.nickname,
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Match Information">
                  <Action.Push
                    title="Comments"
                    icon={Icon.Message}
                    target={<MatchComments slug={match.slug} name={matchName} />}
                  />
                  <Action.Push
                    title="Lineups"
                    icon={Icon.TwoPeople}
                    target={<MatchLineups slug={match.slug} name={matchName} />}
                  />
                  <Action.OpenInBrowser url={`https://www.laliga.com/en-GB/match/${match.slug}`} />
                </ActionPanel.Section>
                {props.action}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
