import { List, Icon, Color, Action, ActionPanel, closeMainWindow, PopToRootType } from "@raycast/api";
import { User, getUsers, inviteUser } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const response = await getUsers();
      return response.users;
    },
    [],
    {
      onError: (error) => {
        console.error("Error getting users", error);
        showMultiScriptErrorToast(error);
      },
    },
  );

  return (
    <List isLoading={isLoading}>
      {data === undefined || data.length === 0 ? (
        <List.EmptyView title={isLoading ? "Loading..." : "No teammates found"} />
      ) : (
        data.map((user) => (
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
