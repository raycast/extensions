import { List, Icon, Color, Action, ActionPanel, closeMainWindow, PopToRootType } from "@raycast/api";
import { User, getUsers, inviteUser } from "./lib/multi";
import { useEffect, useState } from "react";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default function Command() {
  const [users, isLoading] = useGetUsers();

  return (
    <List isLoading={isLoading}>
      {users.length === 0 ? (
        <List.EmptyView title={isLoading ? "Loading..." : "No teammates found"} />
      ) : (
        users.map((user) => (
          <List.Item
            key={user.id}
            title={user.fullname}
            icon={getIcon(user)}
            accessories={getAccessories(user)}
            actions={getActions(user)}
          />
        ))
      )}
    </List>
  );
}

function useGetUsers(): [User[], boolean] {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const response = await getUsers();
      setUsers(response.users);
    } catch (error) {
      console.error("Error getting users", error);
      showMultiScriptErrorToast(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return [users, isLoading];
}

function getIcon(user: User): { source: Icon; tintColor: Color } {
  return { source: Icon.Circle, tintColor: getTintColor(user) };
}

function getTintColor(user: User): Color {
  switch (user.availability) {
    case "online":
      return Color.Green;
    case "focusing":
      return Color.Purple;
    case "away":
    default:
      return Color.SecondaryText;
  }
}

function getAccessories(user: User) {
  return [{ text: user.availability }];
}

function getActions(user: User) {
  if (user.availability === "away") {
    return undefined;
  }

  return (
    <ActionPanel>
      <Action
        title={`Invite ${user.fullname} to Talk`}
        onAction={() => {
          invite(user);
        }}
      />
    </ActionPanel>
  );
}

async function invite(user: User) {
  // Unfortunatelly, we can't close the view before finishing the request because the request is aborted
  // It would be nice to have async actions that only unload the extension after the action is finished
  await inviteUser(user.id);

  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
