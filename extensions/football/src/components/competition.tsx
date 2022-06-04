import { List } from '@raycast/api';
import { Competition } from '../shared/types';

export const CompetitionList = ({
  competitions,
  loadingCompetitions,
}: {
  competitions: Competition[];
  loadingCompetitions: true;
}) => (
  <List isLoading={loadingCompetitions}>
    {!loadingCompetitions &&
      competitions?.map((competition) => (
        <List.Item icon={competition.emblem} title={competition.name} key={competition.id} />
      ))}
  </List>
);

export const CompetitionDropdownSelector = ({
  competitions,
  setSelectedCompetition,
}: {
  competitions?: Competition[];
  setSelectedCompetition: (competition: Competition | undefined) => void;
}) => (
  <List.Dropdown
    tooltip="Select League"
    storeValue={true}
    onChange={(name) => setSelectedCompetition(competitions?.find((competition) => competition.name === name))}
  >
    {competitions?.map((competition) => (
      <List.Dropdown.Item
        key={competition.id}
        title={competition.name}
        value={competition.name}
        icon={competition.emblem}
      />
    ))}
  </List.Dropdown>
);
