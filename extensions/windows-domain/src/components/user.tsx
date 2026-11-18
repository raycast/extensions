import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { convertLDAP100NanoSecondsToDateTime, ldapDatetimeToDate, LDAPUser } from "../lib/ldap";
import {
  LDAPUserCopyAttributeAction,
  LDAPUserCopyEmployeeNumberAction,
  LDAPUserEmailAction,
  LDAPUserPhoneCallAction,
} from "./actions";

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
      accessories={[
        { icon: user.mobile ? Icon.Mobile : undefined },
        { icon: user.telephonenumber ? Icon.Phone : undefined },
        { date: user.whencreated ? ldapDatetimeToDate(user.whencreated) : undefined },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <LDAPUserEmailAction user={user} />
            <LDAPUserPhoneCallAction user={user} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <LDAPUserCopyAttributeAction content={user.displayname} title="Name" />
            <LDAPUserCopyAttributeAction content={user.samaccountname} title="Username" />
            <LDAPUserCopyAttributeAction content={user.mail} title="EMail" />
            <LDAPUserCopyAttributeAction content={user.telephonenumber} title="Phone" />
            <LDAPUserCopyAttributeAction content={user.mobile} title="Mobile" />
            <LDAPUserCopyAttributeAction content={user.title} title="Title" />
            <LDAPUserCopyAttributeAction content={user.department} title="Department" />
            <LDAPUserCopyAttributeAction content={user.company} title="Company" />
            <LDAPUserCopyEmployeeNumberAction user={user} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy LDAP Path" content={user._path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PasswordExpireListItem({
  user,
  domainExpirePasswordPolicy,
}: {
  user: LDAPUser | undefined;
  domainExpirePasswordPolicy?: number;
}) {
  if (!user?.pwdlastset || !domainExpirePasswordPolicy) {
    return null;
  }
  const lastPasswordSetDate = convertLDAP100NanoSecondsToDateTime(Number.parseInt(user.pwdlastset));
  if (!lastPasswordSetDate) {
    return null;
  }
  const secondsToAdd = domainExpirePasswordPolicy;

  const expireDate = new Date();
  expireDate.setSeconds(lastPasswordSetDate.getSeconds() + secondsToAdd);

  const daysBetween = (a: Date, b: Date): number => {
    return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
  };

  const days = daysBetween(expireDate, new Date());

  const inExpireRange = days < 30;

  return (
    <List.Item
      title="Password Expire"
      accessories={[
        {
          tag: { value: inExpireRange ? "Expire Soon" : undefined, color: inExpireRange ? Color.Orange : undefined },
        },
        {
          text: `${expireDate.toDateString()} (${Math.round(days)} days)`,
        },
      ]}
    />
  );
}

function AttributeListItem({ content, title }: { content: string | undefined; title: string }) {
  if (!content) {
    return null;
  }
  return (
    <List.Item
      title={title}
      accessories={[{ text: content }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${title}`} content={content} />
        </ActionPanel>
      }
    />
  );
}

export function LDAPSingleUserList({
  user,
  isLoading,
  domainExpirePasswordPolicy,
}: {
  user: LDAPUser | undefined;
  isLoading?: boolean;
  domainExpirePasswordPolicy?: number;
}) {
  return (
    <List isLoading={isLoading}>
      <List.Section title="User Information">
        <AttributeListItem title="Username" content={user?.samaccountname} />
        <AttributeListItem title="Name" content={user?.displayname} />
        <AttributeListItem title="EMail" content={user?.mail?.toLowerCase()} />
        <AttributeListItem title="Title" content={user?.title} />
        <AttributeListItem title="Company" content={user?.company} />
        <AttributeListItem title="Department" content={user?.department} />
        <AttributeListItem title="Phone" content={user?.telephonenumber} />
        <AttributeListItem title="Mobile" content={user?.mobile} />
        <AttributeListItem title="Employee Number" content={user?.employeenumber} />
        {user?.whencreated && (
          <List.Item title="Account Created" accessories={[{ date: ldapDatetimeToDate(user.whencreated) }]} />
        )}
      </List.Section>
      <List.Section title="Password">
        {user?.pwdlastset && (
          <>
            <PasswordExpireListItem user={user} domainExpirePasswordPolicy={domainExpirePasswordPolicy} />
            <List.Item
              title="Last Password Set"
              accessories={[
                {
                  date: convertLDAP100NanoSecondsToDateTime(
                    user.pwdlastset ? Number.parseInt(user.pwdlastset) : undefined,
                  ),
                },
              ]}
            />
          </>
        )}
      </List.Section>
    </List>
  );
}
