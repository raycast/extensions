import { Action, Icon } from "@raycast/api";
import { LDAPUser } from "../lib/ldap";

export function LDAPUserEmailAction({ user }: { user: LDAPUser }) {
  if (!user.mail) {
    return null;
  }
  return <Action.OpenInBrowser title="Send EMail" url={`mailto:${user.mail}`} icon={Icon.Envelope} />;
}

export function LDAPUserCopyEmployeeNumberAction({ user }: { user: LDAPUser }) {
  if (!user.employeenumber) {
    return null;
  }
  return <Action.CopyToClipboard title="Copy Employee Number" content={user.employeenumber} />;
}

export function LDAPUserCopyAttributeAction({ content, title }: { content: string | undefined; title: string }) {
  if (!content) {
    return null;
  }
  return <Action.CopyToClipboard title={`Copy ${title}`} content={content} />;
}

export function LDAPUserPhoneCallAction({ user }: { user: LDAPUser }) {
  if (!user.telephonenumber) {
    return null;
  }
  return <Action.OpenInBrowser title="Call Phone Number" url={`tel:${user.telephonenumber}`} icon={Icon.Phone} />;
}
