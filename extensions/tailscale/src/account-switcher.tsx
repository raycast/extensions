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
import { execSync } from "child_process";

interface User {
  active: boolean;
  name: string;
}

function loadUsers(unparsedUsers: string[]) {
  const users: User[] = [];

  for (const unparsedUser of unparsedUsers as string[]) {
    const unparsedUserList: string[] = unparsedUser.split(" ");
    let user = {} as User;

    if (unparsedUserList.length == 2) {
      user = {
        active: true,
        name: unparsedUserList[0],
      };
    } else if (unparsedUserList.length == 1) {
      user = {
        active: false,
        name: unparsedUserList[0],
      };
    }

    users.push(user);
  }
  console.log(users);
  return users;
}

function AccountSwitchList() {
  const [users, setUsers] = useState<User[]>();
  useEffect(() => {
    async function fetch() {
      try {
        const ret = execSync("/Applications/Tailscale.app/Contents/MacOS/Tailscale switch --list").toString().trim();
        console.log(ret);
        const data: string[] = ret.split("\n");

        const _list = loadUsers(data);
        setUsers(_list);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Couldn't load users. Make sure Tailscale is connected.");
      }
    }
    fetch();
  }, []);

  const activeUserIcon = { source: Icon.PersonCircle, tintColor: Color.Green };
  const inactiveUserIcon = { source: Icon.PersonCircle };

  // return a list of users, starting with all of the inactive users.
  // output the active user last.
  return (
    <List isLoading={users === undefined}>
      {users
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
                    const command = `/Applications/Tailscale.app/Contents/MacOS/Tailscale switch ${user.name}`;
                    console.log(command);
                    popToRoot();
                    closeMainWindow();
                    const ret = execSync(command).toString().trim();

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
        ))}
    </List>
  );
}

export default function Command() {
  return <AccountSwitchList />;
}
