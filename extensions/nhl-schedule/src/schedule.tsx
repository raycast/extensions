import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface GameDay {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
  games: Game[];
}

interface Game {
  id: number;
  season: number;
  gameType: number;
  venue: Venue;
  neutralSite: boolean;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  gameState: string;
  gameScheduleState: string;
  tvBroadcasts: TVBroadcast[];
  awayTeam: Team;
  homeTeam: Team;
  ticketsLink: string;
  gameCenterLink: string;
}

interface Venue {
  default: string;
  es?: string;
  fr?: string;
}

interface TVBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
}

interface Team {
  id: number;
  placeName: PlaceName;
  abbrev: string;
  logo: string;
  darkLogo: string;
  awaySplitSquad: boolean;
  radioLink: string;
  odds: Odds[];
  ticketsLink: string | undefined;
}

interface PlaceName {
  default: string;
  fr?: string;
}

interface Odds {
  providerId: number;
  value: string;
}

interface OddsPartner {
  partnerId: number;
  country: string;
  name: string;
  imageUrl: string;
  siteUrl?: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

interface ScheduleResponse {
  nextStartDate: string;
  previousStartDate: string;
  gameWeek: GameDay[];
  oddsPartners: OddsPartner[];
  preSeasonStartDate: string;
  regularSeasonStartDate: string;
  regularSeasonEndDate: string;
  playoffEndDate: string;
  numberOfGames: number;
}

function formatGameToMarkdown(gameInfo: Game) {
  console.log(gameInfo);
  let markdownText = ``;
  markdownText += `## ![Away Team Logo](${gameInfo.awayTeam.logo}?raycast-width=25&raycast-height=25) ${gameInfo.awayTeam.placeName.default} (${gameInfo.awayTeam.abbrev}) @  ${gameInfo.homeTeam.placeName.default} (${gameInfo.homeTeam.abbrev}) ![Home Team Logo](${gameInfo.homeTeam.logo}?raycast-width=25&raycast-height=25)\n\n`;
  markdownText += `**Venue:** ${gameInfo.venue.default}\n`;

  markdownText += `### Broadcasting Networks\n\n`;
  gameInfo.tvBroadcasts.forEach((broadcast: TVBroadcast) => {
    markdownText += `- **${broadcast.network}** (${broadcast.market}, ${broadcast.countryCode})\n`;
  });

  markdownText += `\n### Useful Links\n\n`;
  markdownText += `[Buy Tickets](${gameInfo.ticketsLink})\n`;
  markdownText += `\n[NHL Game Center Link](https://www.nhl.com${gameInfo.gameCenterLink})\n`;
  markdownText += `\n[Away Team Radio Broadcast](${gameInfo.awayTeam.radioLink})\n`;
  markdownText += `\n[Home Team Radio Broadcast](${gameInfo.homeTeam.radioLink})\n`;

  return markdownText;
}

export default function Command() {
  const { isLoading, data } = useFetch("https://api-web.nhle.com/v1/schedule/now") as {
    isLoading: boolean;
    data: ScheduleResponse;
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return (
    <List isLoading={isLoading} isShowingDetail>
      
      {(data && data.gameWeek || []).map((date: GameDay) => (
        <List.Section title={date.date}>
          {(date.games || []).map((game: Game) => (
            <List.Item
              key={game.id}
              title={`${game.awayTeam.abbrev} @ ${game.homeTeam.abbrev}`}
              subtitle={new Date(game.startTimeUTC).toLocaleTimeString([], timeOptions)}
              detail={<List.Item.Detail markdown={formatGameToMarkdown(game)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title={`Open NHL Game Center`}
                    url={`https://www.nhl.com${game.gameCenterLink}`}
                  />
                  <Action.OpenInBrowser
                    title={`${game.homeTeam.abbrev} Radio Broadcast`}
                    url={game.homeTeam.radioLink}
                  />
                  <Action.OpenInBrowser
                    title={`${game.awayTeam.abbrev} Radio Broadcast`}
                    url={game.awayTeam.radioLink}
                  />
                  <Action.OpenInBrowser title={`Buy Tickets`} url={game.homeTeam.ticketsLink!} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView icon={{ source: "sad-puck.png" }} title="Something went wrong" />
    </List>
  );
}
