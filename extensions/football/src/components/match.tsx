import { List, Icon, Color, Action, ActionPanel } from '@raycast/api';
import { format, parseISO, isPast } from 'date-fns';
import { URL } from 'node:url';
import { useMatches } from '../hooks/useFootballData';
import { useGroupedMatches } from '../hooks/useGroupedMatches';
import { Match, Team } from '../shared/types';
import { getScoreValue } from '../shared/utilities';

export const MatchItem = ({ match, team }: { match: Match; team?: Team }) => {
  const matchDate = parseISO(match.utcDate);
  const getMatchTitle = () =>
    match.homeTeam.id === team?.id
      ? `${match.homeTeam.shortName ?? 'TBD'} ${getScoreValue(match.score.fullTime.home)} - ` +
        `${getScoreValue(match.score.fullTime.away)} ${match.awayTeam.shortName ?? 'TBD'}`
      : `${match.awayTeam.shortName ?? 'TBD'} ${getScoreValue(match.score.fullTime.away)} - ` +
        `${getScoreValue(match.score.fullTime.home)} ${match.homeTeam.shortName ?? 'TBD'}`;

  const getSearchURL = () => {
    const url = new URL('https://google.com/search');
    url.searchParams.set(
      'q',
      `${match.homeTeam.shortName} ${match.awayTeam.shortName} ${format(matchDate, 'dd MMMM yyyy')}`
    );

    return url.toString();
  };

  return (
    <List.Item
      title={getMatchTitle()}
      key={match.id}
      accessories={[
        { text: format(matchDate, 'dd.MM.yyyy hh:mm') },
        {
          icon: {
            source: Icon.Calendar,
            tintColor: isPast(matchDate) ? Color.Green : Color.SecondaryText,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Search Match Details" url={getSearchURL()} />
        </ActionPanel>
      }
    />
  );
};

export const MatchList = ({ team }: { team: Team }) => {
  const [matches, loadingMatches] = useMatches(team);
  const groupedMatches = useGroupedMatches(matches);

  return (
    <List
      isLoading={loadingMatches}
      navigationTitle={`${team.shortName}'s Matches`}
      searchBarPlaceholder="Search matches"
    >
      <List.Section title="Past Matches">
        {groupedMatches.pastMatches.map((match) => (
          <MatchItem key={match.id} match={match} team={team} />
        ))}
      </List.Section>
      <List.Section title="Upcoming Matches">
        {groupedMatches.upcomingMatches.map((match) => (
          <MatchItem key={match.id} match={match} team={team} />
        ))}
      </List.Section>
    </List>
  );
};
