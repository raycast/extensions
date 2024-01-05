import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";



function formatGameToMarkdown(gameInfo: any) {
  console.log(gameInfo)
  let markdownText = ``;
    markdownText += `## ![Away Team Logo](${gameInfo.awayTeam.logo}?raycast-width=25&raycast-height=25) ${gameInfo.awayTeam.placeName.default} (${gameInfo.awayTeam.abbrev}) @  ${gameInfo.homeTeam.placeName.default} (${gameInfo.homeTeam.abbrev}) ![Home Team Logo](${gameInfo.homeTeam.logo}?raycast-width=25&raycast-height=25)\n\n`;
    markdownText += `**Venue:** ${gameInfo.venue.default}\n`;

    markdownText += `### Broadcasting Networks\n\n`;
    gameInfo.tvBroadcasts.forEach((broadcast: any) => {
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
  console.log("Hello World!")
  const { isLoading, data, revalidate } = useFetch("https://api-web.nhle.com/v1/schedule/now") as { isLoading: boolean; data: any; revalidate: () => void };
  console.log(data);
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
};
  return (
    <List isLoading={isLoading} isShowingDetail>
      {(data.gameWeek || []).map((date: any) => (
        <List.Section title={date.date}>
          {(date.games || []).map((game: any) => (
            <List.Item key={game.id} title={`${game.awayTeam.abbrev} @ ${game.homeTeam.abbrev}`} subtitle={new Date(game.startTimeUTC).toLocaleTimeString([], timeOptions)} detail={
              <List.Item.Detail markdown={formatGameToMarkdown(game)} />
            } actions={
              <ActionPanel>
                <Action.OpenInBrowser title={`Open NHL Game Center`} url={`https://www.nhl.com${game.gameCenterLink}`} />
                <Action.OpenInBrowser title={`${game.homeTeam.abbrev} Radio Broadcast`} url={game.homeTeam.radioLink} />
                <Action.OpenInBrowser title={`${game.awayTeam.abbrev} Radio Broadcast`} url={game.awayTeam.radioLink} />
                <Action.OpenInBrowser title={`Buy Tickets`} url={game.awayTeam.ticketsLink} />
              </ActionPanel>
            }/>
          ))}
        </List.Section>
      ))}
    </List>
  );
}
