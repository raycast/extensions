import { Action } from "@raycast/api";
import { LDAPUser } from "../lib/ldap";

export function LDAPUserEmailAction({ user }: { user: LDAPUser }) {
  if (!user.mail) {
    return null;
  }
  return <Action.OpenInBrowser title="Send EMail" url={`mailto:${user.mail}`} />;
}

export function LDAPUserCopyEmployeeNumberAction({ user }: { user: LDAPUser }) {
  if (!user.employeenumber) {
    return null;
  }
  return <Action.CopyToClipboard title="Copy Employee Number" content={user.employeenumber} />;
}
