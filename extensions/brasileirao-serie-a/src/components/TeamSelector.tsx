import { List } from "@raycast/api";
import { useTeams } from "../hooks";

export function TeamsSelector(props: { value: string; onChange: (value: string) => void }) {
  const [teams] = useTeams();

  return (
    <List.Dropdown tooltip="Filter by teams" value={props.value} onChange={props.onChange}>
      <List.Dropdown.Section>
        <List.Dropdown.Item key="-1" value="-1" title="All Teams" />
        {teams.map((team) => (
          <List.Dropdown.Item key={team.id} value={team.id.toString()} title={team.shortName} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
