import { List } from '@raycast/api';
import { useState } from 'react';
import { CompetitionDropdownSelector } from './components/competition';
import { MatchItem } from './components/match';
import { useCompetitionMatches, useCompetitions } from './hooks/useFootballData';
import { useGroupedMatches } from './hooks/useGroupedMatches';
import { Competition } from './shared/types';

export default () => {
  const [competitions, loadingCompetitions] = useCompetitions();
  const [selectedCompetition, setSelectedCompetition] = useState<Competition>();
  const [matches, loadingMatches] = useCompetitionMatches(selectedCompetition);
  const groupedMatches = useGroupedMatches(matches);
  const determinedMatches = groupedMatches.upcomingMatches.filter(
    (match) => match.homeTeam.shortName && match.awayTeam.shortName
  );

  return (
    <List
      isLoading={loadingCompetitions || loadingMatches}
      searchBarAccessory={
        <CompetitionDropdownSelector competitions={competitions} setSelectedCompetition={setSelectedCompetition} />
      }
      navigationTitle="Upcoming Matches"
      searchBarPlaceholder="Search upcoming matches"
    >
      {!loadingMatches && determinedMatches.map((match) => <MatchItem key={match.id} match={match} />)}
    </List>
  );
};
