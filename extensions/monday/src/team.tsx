import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getTeam } from "./lib/api";
import { ErrorView } from "./lib/helpers";
import { User } from "./lib/models";
import UserDetails from "./userDetails";
import { useCachedPromise } from "@raycast/utils";

export default function MyTeam() {
  const {
    isLoading,
    data: team,
    error,
  } = useCachedPromise(getTeam, [], {
    initialData: [],
  });

  const sortedTeam = team.sort((u1, u2) =>
    u1.name.toLowerCase() < u2.name.toLowerCase() ? -1 : 1
  );

  if (error) {
    return <ErrorView error={error} />;
  } else {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Filter team members by name..."
      >
        {sortedTeam.map((user) => BuildTeamItem({ user }))}
      </List>
    );
  }

  function BuildTeamItem({ user }: { user: User }) {
    return (
      <List.Item
        id={user.id.toString()}
        key={user.id.toString()}
        title={user.name}
        icon={{
          source: user.photo_thumb,
          mask: Image.Mask.Circle,
        }}
        subtitle={user.title}
        actions={getUserActions(user)}
      />
    );
  }

  function getUserActions(user: User) {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Person}
          title="See Contact Details"
          target={<UserDetails user={user} />}
        />

        <Action.OpenInBrowser
          icon="work-management.svg"
          title="Go to User Profile on monday.com"
          url={user.url}
        />

        <Action.CopyToClipboard
          title="Copy User's Profile Link"
          content={user.url}
          shortcut={{ modifiers: ["opt"], key: "c" }}
        />
      </ActionPanel>
    );
  }
}
