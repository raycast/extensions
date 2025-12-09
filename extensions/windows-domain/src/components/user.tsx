import { ActionPanel, List } from "@raycast/api";
import { convertLDAP100NanoSecondsToDateTime, ldapDatetimeToDate, LDAPUser } from "../lib/ldap";
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

export function LDAPSingleUserList({ user, isLoading }: { user: LDAPUser | undefined; isLoading?: boolean }) {
  return (
    <List isLoading={isLoading}>
      <List.Section title="User Information">
        {user?.samaccountname && <List.Item title="Username" accessories={[{ text: user.samaccountname }]} />}
        {user?.displayname && <List.Item title="Name" accessories={[{ text: user.displayname }]} />}
        {user?.mail && <List.Item title="EMail" accessories={[{ text: user.mail?.toLowerCase() }]} />}
        {user?.title && <List.Item title="Title" accessories={[{ text: user.title }]} />}
        {user?.company && <List.Item title="Company" accessories={[{ text: user.company }]} />}
        {user?.department && <List.Item title="Department" accessories={[{ text: user.department }]} />}
        {user?.telephonenumber && <List.Item title="Phone" accessories={[{ text: user.telephonenumber }]} />}
        {user?.mobile && <List.Item title="Mobile" accessories={[{ text: user.mobile }]} />}
        {user?.employeenumber && <List.Item title="Employee Number" accessories={[{ text: user.employeenumber }]} />}
        {user?.whencreated && (
          <List.Item title="Account Created" accessories={[{ date: ldapDatetimeToDate(user.whencreated) }]} />
        )}
      </List.Section>
      <List.Section title="Password">
        {user?.pwdlastset && (
          <List.Item
            title="Password Expire"
            accessories={[
              {
                date: convertLDAP100NanoSecondsToDateTime(
                  user.pwdlastset ? Number.parseInt(user.pwdlastset) : undefined,
                ),
              },
            ]}
          />
        )}
      </List.Section>
    </List>
  );
}
