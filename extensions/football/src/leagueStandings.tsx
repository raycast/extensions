import { List } from '@raycast/api';
import { useState } from 'react';
import startCase from 'lodash/startCase';
import lowerCase from 'lodash/lowerCase';
import { CompetitionDropdownSelector } from './components/competition';
import { useCompetitions } from './hooks/useFootballData';
import { Competition, Standing } from './shared/types';
import { StandingPositionItem, StandingSectionHeader } from './components/standing';
import { useFilteredStandings } from './hooks/useFilteredStandings';

export default () => {
  const [competitions, loadingCompetitions] = useCompetitions();
  const [selectedCompetition, setSelectedCompetition] = useState<Competition>();
  const [standings, loadingStandings] = useFilteredStandings(selectedCompetition);

  const getSectionTitle = (standing: Standing) =>
    !standing.group ? undefined : startCase(lowerCase(standing.group?.replace(/_/g, ' ')));

  return (
    <List
      isLoading={loadingStandings || loadingCompetitions}
      searchBarAccessory={
        <CompetitionDropdownSelector competitions={competitions} setSelectedCompetition={setSelectedCompetition} />
      }
      navigationTitle="League Standings"
      searchBarPlaceholder="Search league standings"
    >
      {!loadingStandings &&
        standings?.map((standing, standingIndex) => (
          <List.Section title={getSectionTitle(standing)} key={standingIndex}>
            <StandingSectionHeader />
            {standing.table.map((standingPosition, standingPositionIndex) => (
              <StandingPositionItem key={standingPositionIndex} standingPosition={standingPosition} />
            ))}
          </List.Section>
        ))}
    </List>
  );
};
