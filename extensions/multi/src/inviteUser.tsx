import { List, Image, Icon, Color, Action, ActionPanel, closeMainWindow, PopToRootType, popToRoot } from "@raycast/api";
import { User, UserSessionRoomReference, getUsers, inviteUser, joinRoom } from "./lib/multi";
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

function getIcon(user: User): Image {
  if (user.session) {
    return { source: "in-session.svg", tintColor: Color.Green };
  }

  switch (user.availability) {
    case "online":
      return { source: "online.svg", tintColor: Color.Green };
    case "focusing":
      return { source: "focusing.svg", tintColor: Color.Purple };
    case "away":
    default:
      return { source: "away.svg", tintColor: Color.SecondaryText };
  }
}

function getAccessories(user: User): List.Item.Accessory[] {
  return [{ text: user.session?.shortdescription ?? capitalizeFirstLetter(user.availability) }];
}

function capitalizeFirstLetter(text: string) {
  return text[0].toUpperCase() + text.slice(1);
}

function getActions(user: User): React.ReactNode {
  if (user.availability === "away") {
    return undefined;
  }

  const actions: ActionPanel.Children[] = [];

  const roomReference = user.session?.room;
  if (roomReference) {
    actions.push(
      <Action
        key="join"
        title={`Join ${roomReference.name}`}
        icon={Icon.AddPerson}
        onAction={() => {
          join(roomReference);
        }}
      />,
    );
  }

  actions.push(
    <Action
      key="invite"
      title={`Invite ${user.fullname} to Talk`}
      icon={Icon.Phone}
      onAction={() => {
        invite(user);
      }}
    />,
  );

  return <ActionPanel>{actions}</ActionPanel>;
}

async function invite(user: User) {
  const closeMainWindowPromise = closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await inviteUser(user.id);
  await closeMainWindowPromise;
  await popToRoot({ clearSearchBar: true });
}

async function join(room: UserSessionRoomReference) {
  const closeMainWindowPromise = closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await joinRoom(room.id);
  await closeMainWindowPromise;
  await popToRoot({ clearSearchBar: true });
}
