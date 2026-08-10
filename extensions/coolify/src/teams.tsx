import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { isValidCoolifyUrl } from "./lib/utils";
import useCoolify from "./lib/use-coolify";
import { Team, TeamMember } from "./lib/types";
import InvalidUrl from "./lib/components/invalid-url";

export default function Teams() {
  if (!isValidCoolifyUrl()) return <InvalidUrl />;

  const { isLoading, data: teams = [] } = useCoolify<Team[]>("teams");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search team">
      <List.Section title="Teams" subtitle={`${teams.length} teams`}>
        {teams.map((team) => (
          <List.Item
            key={team.id}
            icon={Icon.TwoPeople}
            title={team.name}
            subtitle={team.description || ""}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Person} title="View Members" target={<TeamMembers team={team} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function TeamMembers({ team }: { team: Team }) {
  const { isLoading, data: members = [] } = useCoolify<TeamMember[]>(`teams/${team.id}/members`);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search member">
      <List.Section title={`Teams / ${team.name} / Members`} subtitle={`${members.length} members`}>
        {members.map((member) => (
          <List.Item
            key={member.id}
            icon={Icon.Person}
            title={member.name}
            subtitle={member.email}
            accessories={[{ tag: { value: "2FA", color: member.two_factor_confirmed_at ? Color.Green : Color.Red } }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
