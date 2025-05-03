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
  active: boolean;
  name: string;
}

function loadUsers(unparsedUsers: string[]) {
  const users: User[] = [];

  if (unparsedUsers[0]?.startsWith("ID")) {
    // skip 'ID Tailnet Account' header if present
    unparsedUsers = unparsedUsers.slice(1);
  }

  for (const unparsedUser of unparsedUsers as string[]) {
    const unparsedUserList: string[] = unparsedUser.split(" ").filter(Boolean);
    let user = {} as User;

    if (unparsedUserList.length == 3) {
      // accounts with 'ID Tailnet Account'
      user = {
        name: unparsedUserList[1],
        active: unparsedUserList[2].includes("*"),
      };
    } else if (unparsedUserList.length == 2) {
      // accounts with empty tailnet name
      user = {
        name: unparsedUserList[1].replace(/\*$/, ""),
        active: unparsedUserList[1].includes("*"),
      };
    }
    if (unparsedUserList.length == 1) {
      // older clients
      user = {
        name: unparsedUserList[0].replace(/\*$/, ""),
        active: unparsedUserList[0].includes("*"),
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

  // return a list of users, starting with all of the inactive users.
  // output the active user last.
  return (
    <List isLoading={!users && !error}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
        users
          ?.sort((a, b) => +a.active - +b.active)
          .map((user) => (
            <List.Item
              title={user.name}
              key={user.name}
              icon={user.active ? activeUserIcon : inactiveUserIcon}
              subtitle={user.active ? "Active user" : ""}
              actions={
                <ActionPanel>
                  <Action
                    title="Switch to User"
                    onAction={async () => {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Switching user account",
                        message: `${user.name}`,
                      });
                      popToRoot();
                      closeMainWindow();
                      const ret = tailscale(`switch ${user.name}`);

                      if (ret.includes("Success") || ret.includes("Already")) {
                        showHUD(`Active Tailscale user is ${user.name}`);
                      } else {
                        showHUD(`Tailscale user failed to switch to ${user.name}`);
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
