import { List, Icon, Color, Action, ActionPanel, closeMainWindow, PopToRootType, popToRoot } from "@raycast/api";
import { User, getUsers, inviteUser } from "./lib/multi";
import { useCachedPromise } from "@raycast/utils";
import { showMultiScriptErrorToastAndLogError } from "./lib/showMultiScriptErrorToastAndLogError";

export default function Command() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const response = await getUsers();
      return response.users;
    },
    [],
    {
      onError: (error) => {
        showMultiScriptErrorToastAndLogError(error, "getUsers");
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
        icon={Icon.Phone}
        onAction={() => {
          invite(user);
        }}
      />
    </ActionPanel>
  );
}

async function invite(user: User) {
  const closeMainWindowPromise = closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await inviteUser(user.id);
  await closeMainWindowPromise;
  await popToRoot({ clearSearchBar: true });
}
