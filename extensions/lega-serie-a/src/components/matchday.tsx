import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  List,
} from "@raycast/api";
import { format } from "date-fns";
import { Broadcaster, Match, Matchday } from "../types";

const { language } = getPreferenceValues();

interface PropsType {
  date: string;
  fixtures: Match[];
  actionPanel?: JSX.Element;
}

export default function Matchday(props: PropsType) {
  const { date, fixtures, actionPanel } = props;

  return (
    <List.Section title={date.endsWith("2099") ? "To be defined" : date}>
      {fixtures.map((match) => {
        const accessories: List.Item.Accessory[] =
          match.venue_name === "default" ? [] : [{ text: match.venue_name }];

        let broadcasters: Broadcaster[];
        try {
          broadcasters = JSON.parse(match.broadcasters);
          if (match.match_status === 0) {
            broadcasters.forEach((broadcaster) => {
              accessories.push({
                icon: {
                  source: encodeURI(broadcaster.image),
                },
                tooltip: broadcaster.name,
              });
            });
          }
        } catch (error) {
          // do nothing
        }

        let weather;
        try {
          weather = JSON.parse(match.weather);
          accessories.push({
            icon: {
              source: {
                light: weather.icon_day.image_day,
                dark: weather.icon_day.image_night,
              },
            },
            tooltip: weather.icon_description,
          });
        } catch (e) {
          // ignore
        }

        const tbc = !match.match_hm || match.match_hm === "00:00:00";

        let icon: Image.ImageLike = Icon.Clock;
        if (match.match_status === 1) {
          icon = { source: Icon.Livestream, tintColor: Color.Red };

          accessories.unshift({
            tag: {
              value: match.live_timing,
              color: Color.Red,
            },
          });
        } else if (match.match_status === 2) {
          icon = { source: Icon.CheckCircle, tintColor: Color.Green };
        } else if (!tbc) {
          icon = Icon.Calendar;
        }

        return (
          <List.Item
            key={match.match_id}
            title={tbc ? "TBC" : format(new Date(match.date_time), "HH:mm")}
            subtitle={
              match.match_status === 2
                ? `${match.home_team_name} ${match.home_goal} - ${match.away_goal} ${match.away_team_name}`
                : match.match_name
            }
            icon={icon}
            accessories={accessories}
            actions={
              <ActionPanel>
                {match.highlight && (
                  <Action.OpenInBrowser
                    title="Highlights"
                    icon={Icon.Highlight}
                    url={`https://www.legaseriea.it/${language}${match.highlight}`}
                  />
                )}
                {match.match_status === 0 && (
                  <Action.OpenInBrowser
                    title="Buy Ticket"
                    icon={Icon.Wallet}
                    url={match.ticket_url || match.home_team_ticket_url}
                  />
                )}
                <Action.OpenInBrowser
                  url={`https://www.legaseriea.it/${language}${match.slug}`}
                />
                {actionPanel}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
