import { List, Icon, Color } from '@raycast/api';
import { format, parseISO, isPast } from 'date-fns';
import { useMatches } from '../hooks/useFootballData';
import { useGroupedMatches } from '../hooks/useGroupedMatches';
import { Match, Team } from '../shared/types';
import { getScoreValue } from '../shared/utilities';

export const MatchDetails = ({ match }: { match: Match }) => (
  <List.Item.Detail
    markdown={`![${match.homeTeam.name}](${match.homeTeam.crest})![${match.awayTeam.name}](${match.awayTeam.crest})`}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Score" />
        {match.homeTeam.name && (
          <List.Item.Detail.Metadata.Label
            title={match.homeTeam.name}
            icon={match.homeTeam.crest}
            text={match.score.fullTime.home?.toString() ?? ''}
          />
        )}
        {match.awayTeam.name && (
          <List.Item.Detail.Metadata.Label
            title={match.awayTeam.name}
            icon={match.awayTeam.crest}
            text={match.score.fullTime.away?.toString() ?? ''}
          />
        )}
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Additional Information" />
        <List.Item.Detail.Metadata.Label title="Date" text={format(parseISO(match.utcDate), 'yyyy-MM-dd')} />
      </List.Item.Detail.Metadata>
    }
  />
);

export const MatchItem = ({ match, team }: { match: Match; team?: Team }) => {
  const getMatchTitle = (match: Match) =>
    match.homeTeam.id === team?.id
      ? `${match.homeTeam.shortName ?? 'TBD'} ${getScoreValue(match.score.fullTime.home)} - ` +
        `${getScoreValue(match.score.fullTime.away)} ${match.awayTeam.shortName ?? 'TBD'}`
      : `${match.awayTeam.shortName ?? 'TBD'} ${getScoreValue(match.score.fullTime.away)} - ` +
        `${getScoreValue(match.score.fullTime.home)} ${match.homeTeam.shortName ?? 'TBD'}`;

  return (
    <List.Item
      title={getMatchTitle(match)}
      key={match.id}
      accessories={[
        { text: format(parseISO(match.utcDate), 'dd.MM.yyyy hh:mm') },
        {
          icon: {
            source: Icon.Calendar,
            tintColor: isPast(parseISO(match.utcDate)) ? Color.Green : Color.SecondaryText,
          },
        },
      ]}
    />
  );
};

export const MatchList = ({ team }: { team: Team }) => {
  const [matches, loadingMatches] = useMatches(team);
  const groupedMatches = useGroupedMatches(matches);

  return (
    <List isLoading={loadingMatches}>
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
