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
  account: string;
  id: string;
  tailnet: string;

  // display only property
  name: string;
}

function loadUsers(unparsedUsers: string[]) {
  const users: User[] = [];

  // Assuming the first entry is the header row
  const headerRow = unparsedUsers[0];

  // Calculate column widths based on the header row
  const columnWidths = [];
  const headerColumns = headerRow.split(/\s\s+/); // Split by two or more spaces

  // determine each column widthh
  for (const headerColumn of headerColumns) {
    const regex = new RegExp(`${headerColumn}\\s*`);
    const match = headerRow.match(regex);

    columnWidths.push(match?.[0].length ?? 0);
  }

  for (const unparsedUser of unparsedUsers.slice(1)) {
    const user: User = {
      active: false,
      account: "",
      id: "",
      tailnet: "",
      name: "",
    };

    // split the user by the column widths
    let start = 0;
    let end = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      end += columnWidths[i];

      const isLastColumn = i === columnWidths.length - 1;

      let column;
      if (isLastColumn) {
        column = unparsedUser.substring(start).trim();
      } else {
        column = unparsedUser.substring(start, end).trim();
      }

      switch (i) {
        case 0:
          user.id = column;
          break;
        case 1:
          user.tailnet = column;
          break;
        case 2: {
          const active = column.match(/\*$/);
          let account = column;
          if (active) {
            account = column.replace(/\*$/, "");
            user.active = true;
          }

          user.account = account;
          break;
        }
      }

      start = end;
    }

    user.name = `${user.account} (${user.tailnet})`;

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
              title={user.account}
              key={user.id}
              icon={user.active ? activeUserIcon : inactiveUserIcon}
              subtitle={user.tailnet}
              accessories={[
                {
                  icon: user.active ? Icon.Checkmark : undefined,
                },
              ]}
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
                      const ret = tailscale(`switch ${user.id}`);

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
