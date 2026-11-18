import { Form, Icon } from "@raycast/api";

import { getTeams } from "../api/teams";
import { useJiraCachedPromise } from "../hooks/useJiraCache";

export function FormTeamDropdown({ name, ...props }: Form.Dropdown.Props & { name: string }) {
  const { data: teams } = useJiraCachedPromise(() => getTeams(), []);

  return (
    <Form.Dropdown {...props} title={name} storeValue>
      <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.TwoPeople} />

      {teams?.map((team) => {
        return (
          <Form.Dropdown.Item key={team.teamId} value={team.teamId} title={team.displayName} icon={Icon.TwoPeople} />
        );
      })}
    </Form.Dropdown>
  );
}
