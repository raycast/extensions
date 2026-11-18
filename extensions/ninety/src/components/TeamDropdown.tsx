import { List } from "@raycast/api";
import { AvailableTeam } from "../api/types";

export const MY_ITEMS = "__mine__";

interface Props {
  /** Used as the storage key, so each command remembers its own last choice. */
  id: string;
  teams: AvailableTeam[];
  onChange: (value: string) => void;
  /** Optional first option such as "My To-Dos" (value MY_ITEMS). */
  mineTitle?: string;
}

export function TeamDropdown({ id, teams, onChange, mineTitle }: Props) {
  const memberTeams = teams.filter((team) => team.isMember);
  const otherTeams = teams.filter((team) => !team.isMember);
  return (
    <List.Dropdown id={id} tooltip="Select Team" storeValue onChange={onChange}>
      {mineTitle ? <List.Dropdown.Item title={mineTitle} value={MY_ITEMS} /> : null}
      <List.Dropdown.Section title={otherTeams.length ? "My Teams" : undefined}>
        {memberTeams.map((team) => (
          <List.Dropdown.Item key={team._id} title={team.name} value={team._id} />
        ))}
      </List.Dropdown.Section>
      {otherTeams.length ? (
        <List.Dropdown.Section title="Other Teams">
          {otherTeams.map((team) => (
            <List.Dropdown.Item key={team._id} title={team.name} value={team._id} />
          ))}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}
