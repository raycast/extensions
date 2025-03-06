import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Fixture } from "../types";
import { convertToLocalTime, getMatchStatusIcon } from "../utils";
import MatchCommentary from "./commentary";
import MatchLineups from "./lineup";

interface PropsType {
  matchday: string;
  matches: Fixture[];
}

export default function Matchday(props: PropsType) {
  const { matchday, matches } = props;

  return (
    <List.Section key={matchday} title={matchday}>
      {matches.map((match) => {
        const time = convertToLocalTime(match.kickoff.label, "HH:mm");
        const icon = getMatchStatusIcon(match);

        const accessories: List.Item.Accessory[] = [
          { text: `${match.ground.name}, ${match.ground.city}` },
          {
            icon: {
              source: "stadium.svg",
              tintColor: Color.SecondaryText,
            },
          },
        ];

        if (match.status === "L") {
          accessories.unshift({
            tag: {
              value: match.clock?.label,
              color: Color.Red,
            },
          });
        }

        const keywords = match.teams
          .map((t) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...rest } = t.team.club;
            return Object.values(rest);
          })
          .flat();

        const subtitle =
          match.status === "U"
            ? `${match.teams[0].team.name} - ${match.teams[1].team.name}`
            : `${match.teams[0].team.name} ${match.teams[0].score} - ${match.teams[1].score} ${match.teams[1].team.name}`;

        return (
          <List.Item
            key={match.id}
            title={time || "TBC"}
            subtitle={subtitle}
            icon={icon}
            accessories={accessories}
            keywords={keywords}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Information">
                  <Action.Push
                    title="Match Commentary"
                    icon={Icon.Message}
                    target={<MatchCommentary match={match} title={subtitle} />}
                  />
                  <Action.Push
                    title="Match Line-ups"
                    icon={Icon.TwoPeople}
                    target={<MatchLineups match={match} title={subtitle} />}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.premierleague.com/match/${match.id}`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
