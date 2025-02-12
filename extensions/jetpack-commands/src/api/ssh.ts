import { showToast, Toast } from "@raycast/api";
import { useWPCOMClient } from "../helpers/withWPCOMClient";

export interface SSHUser {
  username: string | null;
  password: string | null;
}

const emptyUser: SSHUser = {
  username: null,
  password: null,
};

export async function fetchSSHUser(siteId: number) {
  if (!siteId) {
    return emptyUser;
  }
  const { wp } = useWPCOMClient();
  try {
    const { users }: { users?: string[] } = await wp.req.get({
      path: `/sites/${siteId}/hosting/ssh-users`,
      apiNamespace: "wpcom/v2",
    });

    if (users?.length) {
      return { username: users[0], password: null };
    } else {
      // No SFTP user created yet.
      return emptyUser;
    }
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch SSH user",
    });
    return emptyUser;
  }
}
export async function resetSSHPassword(siteId: number, sshUser: SSHUser) {
  if (!siteId || !sshUser.username) {
    return emptyUser;
  }
  const { wp } = useWPCOMClient();
  try {
    const updatedSshUser: SSHUser = await wp.req.post({
      path: `/sites/${siteId}/hosting/ssh-user/${sshUser.username}/reset-password`,
      apiNamespace: "wpcom/v2",
      body: {},
    });
    return updatedSshUser;
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to update SSH password",
    });
    return emptyUser;
  }
}
