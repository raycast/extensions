import { ActionPanel, List } from "@raycast/api";
import { LDAPUser } from "../lib/ldap";
import { LDAPUserCopyEmployeeNumberAction, LDAPUserEmailAction } from "./actions";

export function LDAPUserListItem({ user }: { user: LDAPUser }) {
  const subtitle = (user: LDAPUser) => {
    const parts = [];
    if (user.title) {
      parts.push(user.title);
    }
    if (user.department) {
      parts.push(user.department);
    }
    return parts.join(" • ");
  };
  return (
    <List.Item
      key={user.samaccountname}
      title={user.displayname || "No Display Name"}
      subtitle={subtitle(user)}
      icon={user.thumbnailphoto}
      actions={
        <ActionPanel>
          <LDAPUserEmailAction user={user} />
          <LDAPUserCopyEmployeeNumberAction user={user} />
        </ActionPanel>
      }
    />
  );
}
