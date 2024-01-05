import { ActionPanel, List, Action, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
interface TeamName {
  default: string;
  fr?: string;
}

interface StandingsEntry {
  placeName: TeamName;
  teamName: TeamName;
  teamCommonName: TeamName;
  teamAbbrev: TeamName;
  teamLogo: string;
}

interface StandingsResponse {
  wildCardIndicator: boolean;
  standings: StandingsEntry[];
}

interface ScheduleData {
  previousSeason: number;
  currentSeason: number;
  clubTimezone: string;
  clubUTCOffset: string;
  games: Game[];
}

interface Game {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
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
  periodDescriptor: PeriodDescriptor;
  ticketsLink: string;
  gameCenterLink: string;
}

interface Venue {
  default: string;
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
  radioLink?: string;
  score?: number;
}

interface PlaceName {
  default: string;
  fr?: string;
}

interface PeriodDescriptor {
  periodType?: string;
  lastPeriodType?: string;
}

export default function Command() {
  console.log("Hello World!!");
  const { push } = useNavigation();

  const { isLoading, data } = useFetch(`https://api-web.nhle.com/v1/standings/now`) as {
    isLoading: boolean;
    data: StandingsResponse;
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data.standings.map((team: StandingsEntry) => (
        <List.Item
          title={team.teamName.default}
          subtitle={team.placeName.default}
          detail={<List.Item.Detail markdown={`![Team Logo](${team.teamLogo}?raycast-width=150&raycast-height=150)`} />}
          actions={
            <ActionPanel>
              <Action title="Push" onAction={() => push(<TeamScheduleList teamAbbrev={team.teamAbbrev.default} />)} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={{ source: "sad-puck.png" }} title="Something went wrong" />
    </List>
  );
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

function TeamScheduleList(props: { teamAbbrev: string }) {
  const [selectedGame, setSelectedGame] = useState<Game | undefined>(undefined);
  const { data, isLoading } = useFetch(`https://api-web.nhle.com/v1/club-schedule-season/${props.teamAbbrev}/now`, {
    onData: (data: ScheduleData) => {
      // Find the closest next game
      const now = new Date();
      const nextGame = data.games.find((game: Game) => {
        const gameDate = new Date(game.gameDate);
        return gameDate > now;
      });
      setSelectedGame(nextGame);
    },
  }) as { isLoading: boolean; data: ScheduleData };
  return (
    <List isLoading={isLoading} selectedItemId={selectedGame?.id.toString()} isShowingDetail>
      {data &&
        data.games &&
        data.games.map((game: Game) => (
          <List.Item
            title={game.awayTeam.placeName.default + " @ " + game.homeTeam.placeName.default}
            subtitle={game.gameDate}
            id={game.id.toString()}
            detail={<List.Item.Detail markdown={formatGameToMarkdown(game)} />}
          />
        ))}
      <List.EmptyView icon={{ source: "sad-puck.png" }} title="Something went wrong" />
    </List>
  );
}
