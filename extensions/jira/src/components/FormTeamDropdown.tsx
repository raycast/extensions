import { Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getTeams } from "../api/teams";

export function FormTeamDropdown({ name, ...props }: Form.Dropdown.Props & { name: string }) {
  const { data: teams } = useCachedPromise(() => getTeams());

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
