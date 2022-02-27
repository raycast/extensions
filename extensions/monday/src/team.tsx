import { Action, ActionPanel, Image, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { getTeam } from "./lib/api";
import { ErrorView } from "./lib/helpers";
import { User } from "./lib/models";
import { cacheTeam, getCachedTeam } from "./lib/persistence";
import UserDetails from "./userDetails";

export default function MyTeam() {
  const [state, setState] = useState<{
    isLoading: boolean;
    team: User[];
    error?: string;
  }>({
    isLoading: true,
    team: [],
  });

  useEffect(() => {
    async function fetch() {
      const cachedTeam = await getCachedTeam();

      if (cachedTeam) {
        setState((oldState) => ({
          ...oldState,
          team: cachedTeam,
          isLoading: false,
        }));
      }

      try {
        const team = await getTeam();
        await cacheTeam(team);
        setState((oldState) => ({
          ...oldState,
          team: team,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          error: error as string,
        }));
      }
    }
    fetch();
  }, []);

  const sortedTeam = state.team.sort((u1, u2) =>
    u1.name.toLowerCase() < u2.name.toLowerCase() ? -1 : 1
  );

  if (state.error) {
    return <ErrorView error={state.error} />;
  } else {
    return (
      <List
        isLoading={state.isLoading}
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
          title="See contact details"
          target={<UserDetails user={user} />}
          shortcut={{ modifiers: ["cmd"], key: "enter" }}
        />

        <Action.OpenInBrowser
          title="Go to user profile on monday.com"
          url={user.url}
        />

        <Action.CopyToClipboard
          title="Copy user's profile link"
          content={user.url}
          shortcut={{ modifiers: ["opt"], key: "c" }}
        />
      </ActionPanel>
    );
  }
}
