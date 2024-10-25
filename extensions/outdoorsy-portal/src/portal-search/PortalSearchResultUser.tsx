import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { IAdminSearchResultUser } from "../types";

import OpenInBrowserAction from "../common/OpenInBrowserAction";
import { PORTAL_URL } from "../utils/consts";
import ImpersonateUserAction from "../common/ImpersonateUserAction";

interface IPortalSearchResultUserProps {
  user: IAdminSearchResultUser;
  adminToken: string;
}

export default function PortalSearchResultUser(props: IPortalSearchResultUserProps) {
  const { user, adminToken } = props;
  const { id, first_name, last_name, email, avatar_url } = user;

  return (
    <List.Item
      id={`${id}`}
      title={`${first_name} ${last_name}`}
      subtitle={email}
      icon={avatar_url}
      accessories={[{ icon: Icon.Person}]}
      actions={
        <ActionPanel title="User Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/users/${id}`} />
          <ImpersonateUserAction id={id} adminToken={adminToken} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}

interface IPortalSearchResultUserByIdProps {
  id: number;
  adminToken: string;
}

export function PortalSearchResultUserById(props: IPortalSearchResultUserByIdProps) {
  const { id, adminToken } = props;

  return (
    <List.Item
      title={`User ${id}`}
      accessories={[{ icon: Icon.Person }]}
      actions={
        <ActionPanel title="User Actions">
          <OpenInBrowserAction title="Open in Portal" url={`${PORTAL_URL}/users/${id}`} />
          <ImpersonateUserAction id={id} adminToken={adminToken} />
          <Action.CopyToClipboard title="Copy ID" content={id} />
        </ActionPanel>
      }
    />
  )
}
