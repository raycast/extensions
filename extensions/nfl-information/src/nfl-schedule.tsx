import { ActionPanel, List, Action, Color, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BroadcastsItem, CompetitorsItem, ScheduleResponse, EventsItem, LinksItem } from "./model/schedule-response";

const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

const dateOption: Intl.DateTimeFormatOptions = {
  weekday: "long",
};

function GameDetailView(props: { gameInfo: EventsItem }) {
  /**
   * Show the game details for a specific game
   * @param props
   * @param props.gameInfo - The game info for the game
   * @returns
   * @example
   * <GameDetailView gameInfo={gameInfo} />
   *
   */

  const { gameInfo } = props;

  const gameDate = new Date(gameInfo.date);
  const game = gameInfo.competitions[0];
  const homeTeam = game.competitors[0];
  const awayTeam = game.competitors[1];
  const gameTime = gameDate.toLocaleDateString([], dateOption) + " " + gameDate.toLocaleTimeString([], timeOptions);
  const gameScore = awayTeam.score + "-" + homeTeam.score;
  const networks = game.broadcasts.map((broadcast: BroadcastsItem) => broadcast.names).join(", ");
  const weather =
    gameInfo.weather && gameInfo ? `${gameInfo.weather.temperature}°F - ${gameInfo.weather.displayValue}` : undefined;

  return (
    <Detail
      markdown={formatGameToMarkdown(gameInfo)}
      navigationTitle={gameInfo.name}
      metadata={
        <Detail.Metadata>
          {gameInfo.status.type.completed && <Detail.Metadata.Label title="Game Score" text={gameScore} />}
          {gameInfo.status.type.completed && <Detail.Metadata.Separator />}

          <Detail.Metadata.Label title="Game Time" text={gameTime} />
          <Detail.Metadata.TagList title="Venue">
            <Detail.Metadata.TagList.Item text={game.venue.fullName} color={homeTeam.team.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Networks" text={networks} />

          {weather && <Detail.Metadata.Label title="Weather" text={weather} />}
          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title={`${homeTeam.team.abbreviation} Team Record`}
            text={homeTeam.records[0].summary}
          />
          <Detail.Metadata.Label title="Away Team Record" text={awayTeam.records[0].summary} />
        </Detail.Metadata>
      }
    />
  );
}

function formatGameToMarkdown(gameInfo: EventsItem) {
  /**
   * Format the game info into markdown
   * @param gameInfo - The game info
   * @returns - The markdown text
   * @example
   * formatGameToMarkdown(gameInfo)
   */

  const homeTeam: CompetitorsItem = gameInfo.competitions[0]?.competitors[0];
  const awayTeam: CompetitorsItem = gameInfo.competitions[0]?.competitors[1];

  let markdownText = ``;
  markdownText += `## ![Team Logo](${awayTeam.team.logo}?raycast-width=150&raycast-height=150)`;
  markdownText += ` @ `;
  markdownText += `![Team Logo](${homeTeam.team.logo}?raycast-width=150&raycast-height=150)\n`;
  markdownText += `### ${awayTeam.team.displayName} (${awayTeam.records[0].summary}) at ${homeTeam.team.displayName} (${homeTeam.records[0].summary})\n\n`;

  markdownText += `\n### Useful Links\n\n`;
  gameInfo.links.forEach((link: LinksItem) => {
    markdownText += `- [${link.text}](${link.href})\n`;
  });

  if (awayTeam.leaders && homeTeam.leaders) {
    const awayPassingLeader = awayTeam.leaders[0].leaders[0];
    const awayRushingLeader = awayTeam.leaders[1].leaders[0];
    const awayReceivingLeader = awayTeam.leaders[2].leaders[0];

    const homePassingLeader = homeTeam?.leaders[0].leaders[0];
    const homeRushingLeader = homeTeam?.leaders[1].leaders[0];
    const homeReceivingLeader = homeTeam?.leaders[2].leaders[0];

    if (awayPassingLeader && homePassingLeader && awayPassingLeader.athlete && homePassingLeader.athlete) {
      markdownText += `### Passing Leaders\n\n`;
      markdownText += `#### [${awayPassingLeader.athlete.displayName}](${awayPassingLeader.athlete.links[0].href}) (${awayPassingLeader.athlete.position.abbreviation}) (${awayPassingLeader.displayValue})\n\n`;
      markdownText += `#### [${homePassingLeader.athlete.displayName}](${homePassingLeader.athlete.links[0].href}) (${homePassingLeader.athlete.position.abbreviation}) (${homePassingLeader.displayValue})\n\n`;
    }

    if (awayRushingLeader && homeRushingLeader && awayRushingLeader.athlete && homeRushingLeader.athlete) {
      markdownText += `### Rushing Leaders\n\n`;
      markdownText += `#### [${awayRushingLeader.athlete.displayName}](${awayRushingLeader.athlete.links[0].href}) (${awayRushingLeader.athlete.position.abbreviation}) (${awayRushingLeader.displayValue})\n\n`;
      markdownText += `#### [${homeRushingLeader.athlete.displayName}](${homeRushingLeader.athlete.links[0].href}) (${homeRushingLeader.athlete.position.abbreviation}) (${homeRushingLeader.displayValue})\n\n`;
    }

    if (awayReceivingLeader && homeReceivingLeader && awayReceivingLeader.athlete && homeReceivingLeader.athlete) {
      markdownText += `### Receiving Leaders\n\n`;
      markdownText += `#### [${awayReceivingLeader.athlete.displayName}](${awayReceivingLeader.athlete.links[0].href}) (${awayReceivingLeader.athlete.position.abbreviation}) (${awayReceivingLeader.displayValue})\n\n`;
      markdownText += `#### [${homeReceivingLeader.athlete.displayName}](${homeReceivingLeader.athlete.links[0].href}) (${homeReceivingLeader.athlete.position.abbreviation}) (${homeReceivingLeader.displayValue})\n\n`;
    }
  }
  // Notes
  markdownText += `### Notes\n\n`;
  markdownText += `#### ${gameInfo.competitions[0].notes[0].headline}\n\n`;

  // Tickets
  if (gameInfo.competitions[0].tickets) {
    const tickets = gameInfo.competitions[0].tickets;
    markdownText += `#### ${tickets[0].summary}`;
    markdownText += ` [Buy Tickets](${tickets[0].links[0].href})\n\n`;
  }
  return markdownText;
}

// inputDictionary: { [key: string]: number }
function Section(props: {
  date: string;
  eventsByDay: { [key: string]: EventsItem[] };
  timeOptions: Intl.DateTimeFormatOptions;
}) {
  /**
   * Show a list section for a specific day
   * @param props
   * @param props.date - The date of the game
   * @param props.eventsByDay - The events for the day
   * @param props.timeOptions - The time options for the game
   * @returns
   * @example
   * <Section date="Saturday" eventsByDay={eventsByDay} timeOptions={timeOptions} />
   *
   */

  const { date, eventsByDay, timeOptions } = props;
  const events = eventsByDay[date] || [];

  return (
    <List.Section title={date}>
      {events.map((event: EventsItem) => {
        return <Row key={event.id} events={event} timeOptions={timeOptions} />;
      })}
    </List.Section>
  );
}

function Row(props: { events: EventsItem; timeOptions: Intl.DateTimeFormatOptions }) {
  /**
   * Show a list item for a specific game
   * @param props
   * @param props.events - The event object for the game
   * @param props.timeOptions - The time options for the game
   * @returns
   * @example
   * <Row events={event} timeOptions={timeOptions} />
   *
   */

  const event = props.events;
  const homeTeam = event.competitions[0].competitors[0];
  const awayTeam = event.competitions[0].competitors[1];

  return (
    <List.Item
      key={event.id}
      title={event.name}
      subtitle={event.shortName}
      actions={
        <ActionPanel>
          <Action.Push title="View Game Details" target={<GameDetailView gameInfo={event} />} />
        </ActionPanel>
      }
      accessories={[
        // If the game happened, display the score, make it a tag and show it like
        event.status.type.completed
          ? { tag: { value: `FINAL ${awayTeam.score}-${homeTeam.score}`, color: Color.PrimaryText } }
          : {},
        {
          text: {
            value: new Date(event.date).toLocaleTimeString([], props.timeOptions),
            color: Color.PrimaryText,
          },
        },
        { icon: awayTeam.team.logo },
        { text: { value: "vs", color: Color.PrimaryText } },
        { icon: homeTeam.team.logo },
      ]}
    />
  );
}

export default function Command() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;
  const { isLoading, data } = useFetch(url) as {
    isLoading: boolean;
    data: ScheduleResponse;
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  /// Get a list of unique days for the games and sort the list
  const uniqueDays = data?.events
    ?.map((event: EventsItem) => new Date(event.date).toLocaleDateString([], dateOption))
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  /// Organise the data into a chronological list, where it is organised by the day like "Saturday" make them into List Sections
  /// Each List Section has a header of the day and then the list of games for that day
  const listSections: { [key: string]: EventsItem[] } = {};
  data?.events?.forEach((event: EventsItem) => {
    const date = new Date(event.date).toLocaleDateString([], dateOption);
    if (listSections[date]) {
      listSections[date].push(event);
    } else {
      listSections[date] = [event];
    }
  });

  /// Return the list of games using Section and Row
  return (
    <List isLoading={isLoading}>
      {uniqueDays &&
        uniqueDays.map((date: string) => {
          return <Section key={date} date={date} eventsByDay={listSections} timeOptions={timeOptions} />;
        })}
      <List.EmptyView icon={{ source: "nfl-logo.png" }} title="Something went wrong" />
    </List>
  );
}
