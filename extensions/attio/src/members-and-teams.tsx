import { useCachedPromise } from "@raycast/utils";
import { attio } from "./attio";
import { Icon, List } from "@raycast/api";

export default function MembersAndTeams() {
  const { isLoading, data: members } = useCachedPromise(
    async () => {
      const { data } = await attio.workspaceMembers.list();
      return data;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {members.map((member) => (
        <List.Item
          key={member.id.workspaceMemberId}
          icon={member.avatarUrl || Icon.Person}
          title={`${member.firstName} ${member.lastName}`}
          subtitle={member.emailAddress}
          accessories={[{ tag: member.accessLevel }]}
        />
      ))}
    </List>
  );
}
