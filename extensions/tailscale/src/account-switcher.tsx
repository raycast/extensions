import {
  ActionPanel,
  List,
  Action,
  popToRoot,
  closeMainWindow,
  Color,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorDetails, getErrorDetails, tailscale } from "./shared";

interface User {
  id: string;
  active: boolean;
  name: string;
  tailnet: string | undefined;
}

function loadUsers(unparsedUsers: string[]) {
  const users: User[] = [];

  if (unparsedUsers[0]?.startsWith("ID")) {
    // skip 'ID Tailnet Account' header if present
    unparsedUsers = unparsedUsers.slice(1);
  }

  for (const unparsedUser of unparsedUsers as string[]) {
    const unparsedUserList: string[] = unparsedUser.split(" ").filter(Boolean);
    // if no accounts, fail nicely
    if (unparsedUserList.length === 0) continue;
    let user = {} as User;

    if (unparsedUserList.length == 3) {
      // accounts with 'ID Tailnet Account'
      user = {
        id: unparsedUserList[0],
        name: unparsedUserList[2].replace(/\*$/, ""),
        active: unparsedUserList[2].includes("*"),
        tailnet: unparsedUserList[1],
      };
    } else if (unparsedUserList.length == 2) {
      // two-column output can be either '<tailnet> <account>' or 'ID <account>'
      const first = unparsedUserList[0];
      const second = unparsedUserList[1];
      const name = second.replace(/\*$/, "");
      // if the first column is purely numeric, treat it as an ID (older CLI format)
      if (/^\d+$/.test(first)) {
        user = {
          id: first,
          name,
          active: second.includes("*"),
          tailnet: undefined,
        };
      } else {
        // assume '<tailnet> <account>'
        user = {
          id: name,
          name,
          active: second.includes("*"),
          tailnet: first || undefined,
        };
      }
    } else if (unparsedUserList.length == 1) {
      // older clients
      const name = unparsedUserList[0].replace(/\*$/, "");
      user = {
        id: name,
        name,
        active: unparsedUserList[0].includes("*"),
        tailnet: undefined,
      };
    }

    users.push(user);
  }
  return users;
}

export default function AccountSwitchList() {
  const [users, setUsers] = useState<User[]>();
  const [error, setError] = useState<ErrorDetails>();
  useEffect(() => {
    async function fetch() {
      try {
        const ret = tailscale(`switch --list`);
        const data = ret.split("\n");
        const _list = loadUsers(data);
        setUsers(_list);
      } catch (error) {
        setError(getErrorDetails(error, "Couldn’t load users."));
      }
    }
    fetch();
  }, []);

  const activeUserIcon = { source: Icon.PersonCircle, tintColor: Color.Green };
  const inactiveUserIcon = { source: Icon.PersonCircle };

  // see if user is logged in to multiple tailnets
  // if only one, then there's no need to show "on tailnet" because it's redundant
  const multipleTailnets = new Set((users ?? []).map((u) => u.tailnet).filter(Boolean)).size > 1;
  const userLabel = (user: User) => (multipleTailnets && user.tailnet ? `${user.name} on ${user.tailnet}` : user.name);

  // return a list of users, starting with all of the inactive users.
  // output the active user last.
  return (
    <List isLoading={!users && !error}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
        [...(users ?? [])]
          .sort((a, b) => Number(a.active) - Number(b.active))
          .map((user) => (
            <List.Item
              title={user.name}
              key={user.id}
              icon={user.active ? activeUserIcon : inactiveUserIcon}
              subtitle={user.tailnet}
              actions={
                <ActionPanel>
                  <Action
                    title="Switch to User"
                    onAction={async () => {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Switching user account",
                        message: userLabel(user),
                      });
                      popToRoot();
                      closeMainWindow();
                      const ret = tailscale(`switch ${user.id}`);

                      if (ret.includes("Success") || ret.includes("Already")) {
                        showHUD(`Active Tailscale user is ${userLabel(user)}`);
                      } else {
                        showHUD(`Tailscale user failed to switch to ${userLabel(user)}`);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}
