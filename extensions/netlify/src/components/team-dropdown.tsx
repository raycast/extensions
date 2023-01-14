import { Image, List } from '@raycast/api';

import { Team } from '../utils/interfaces';

interface Props {
  required?: boolean;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  teams: Team[];
}

export default function TeamDropdown(props: Props) {
  const { required, teams, selectedTeam, setSelectedTeam } = props;
  return (
    <List.Dropdown
      onChange={setSelectedTeam}
      placeholder="Filter teams"
      tooltip="Scope search to selected team"
      value={selectedTeam}
    >
      {!required && (
        <List.Dropdown.Item title="Search across all teams" value="" />
      )}
      <List.Dropdown.Section>
        {teams
          .sort((a, b) =>
            a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1,
          )
          .map((team) => (
            <List.Dropdown.Item
              key={team.slug}
              icon={{
                source: team.team_logo_url ? team.team_logo_url : 'icon.png',
                mask: Image.Mask.RoundedRectangle,
              }}
              title={team.name}
              value={team.slug}
            />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
