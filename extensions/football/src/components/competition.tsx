import { List } from '@raycast/api';
import { Competition } from '../shared/types';

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
