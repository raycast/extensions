import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Fixture } from "../types";
import { convertISOToLocalTime, getMatchStatusIcon } from "../utils";
import MatchCommentary from "./commentary";
import MatchLineups from "./lineup";
import MatchReports from "./report";
import { JSX } from "react";

interface PropsType {
  matchday: string;
  matches: Fixture[];
  actions: JSX.Element;
}

export default function Matchday(props: PropsType) {
  const { matchday, matches } = props;

  return (
    <List.Section key={matchday} title={matchday}>
      {matches.map((match) => {
        const time = convertISOToLocalTime(
          match.kickoff,
          match.kickoffTimezone,
          "HH:mm",
        );
        const icon = getMatchStatusIcon(match);

        const accessories: List.Item.Accessory[] = [
          { text: match.ground },
          {
            icon: {
              source: "stadium.svg",
              tintColor: Color.SecondaryText,
            },
          },
        ];

        if (match.period === "L") {
          accessories.unshift({
            tag: {
              value: match.clock,
              color: Color.Red,
            },
          });
        }

        const keywords = [
          match.homeTeam.name,
          match.homeTeam.shortName,
          match.homeTeam.abbr,
          match.awayTeam.name,
          match.awayTeam.shortName,
          match.awayTeam.abbr,
        ];

        const subtitle =
          match.period === "PreMatch"
            ? `${match.homeTeam.name} - ${match.awayTeam.name}`
            : `${match.homeTeam.name} ${match.homeTeam.score} - ${match.awayTeam.score} ${match.awayTeam.name}`;

        return (
          <List.Item
            key={match.matchId}
            title={time || "TBC"}
            subtitle={subtitle}
            icon={icon}
            accessories={accessories}
            keywords={keywords}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Information">
                  {match.period === "FullTime" && (
                    <Action.Push
                      title="Match Reports"
                      icon={Icon.Highlight}
                      target={<MatchReports match={match} title={subtitle} />}
                    />
                  )}
                  <Action.Push
                    title="Match Commentary"
                    icon={Icon.Message}
                    target={<MatchCommentary match={match} title={subtitle} />}
                  />
                  <Action.Push
                    title="Match Lineups"
                    icon={Icon.TwoPeople}
                    target={<MatchLineups match={match} title={subtitle} />}
                  />
                  <Action.OpenInBrowser
                    url={`https://www.premierleague.com/en/match/${match.matchId}`}
                  />
                </ActionPanel.Section>
                {props.actions}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
