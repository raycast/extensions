import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo } from "react";
import NotesList from "./components/NotesList";
import api from "./lib/api";
import { getPreferences } from "./lib/preference";

export default function BrowseNotes() {
  const { instance_url } = getPreferences();
  const { data: user } = useCachedPromise(() => api.getMe());

  const teams = useMemo(() => user?.teams ?? [], [user]);
  const [teamPath, setTeamPath] = useCachedState<string>("team", "");

  const {
    isLoading: isTeamNotesLoading,
    data,
    mutate,
  } = useCachedPromise((path: string) => api.getTeamNotes(path), [teamPath], {
    execute: !!teamPath,
  });

  const {
    isLoading: isMyNotesLoading,
    data: myNotes,
    mutate: mutateMyNotes,
  } = useCachedPromise(() => api.getNoteList());

  const notes = useMemo(() => {
    if (teamPath) {
      return data;
    }
    return myNotes;
  }, [teamPath, data, myNotes]);

  const mutateFn = useMemo(() => {
    if (teamPath) {
      return mutate;
    }
    return mutateMyNotes;
  }, [teamPath, mutate, mutateMyNotes]);

  const isNotesLoading = useMemo(() => {
    if (teamPath) {
      return isTeamNotesLoading;
    }
    return isMyNotesLoading;
  }, [teamPath, isTeamNotesLoading, isMyNotesLoading]);

  const workspaceName = useMemo(() => {
    if (!teamPath) {
      return "My Workspace";
    }
    const team = teams.find((t) => t.path === teamPath);
    return team ? team.name : "Team Workspace";
  }, [teamPath, teams]);

  const workspaceUrl = new URL(teamPath ? `team/${encodeURIComponent(teamPath)}` : "", instance_url);
  workspaceUrl.searchParams.set("nav", "overview");
  const profilePath = teamPath || user?.userPath;
  const workspaceActions = (
    <ActionPanel.Section title={workspaceName}>
      <Action.OpenInBrowser title="Open Workspace in Browser" url={workspaceUrl.toString()} />
      {profilePath && (
        <Action.OpenInBrowser
          title="Open Profile in Browser"
          url={new URL(`@${encodeURIComponent(profilePath)}`, instance_url).toString()}
        />
      )}
    </ActionPanel.Section>
  );

  return (
    <NotesList
      notes={notes}
      mutate={mutateFn}
      isLoading={isNotesLoading}
      unpinnedSectionTitle={workspaceName}
      additionalActions={workspaceActions}
      searchBarAccessory={
        <List.Dropdown tooltip="Select a Workspace" onChange={(path) => setTeamPath(path)} storeValue>
          <List.Dropdown.Item
            key="my-notes"
            value=""
            title="My Workspace"
            icon={
              !user?.photo
                ? Icon.PersonCircle
                : {
                    source: user?.photo || "",
                    mask: Image.Mask.Circle,
                  }
            }
          />

          {teams.length > 0 &&
            teams
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
                <List.Dropdown.Item
                  key={team.path}
                  value={team.path}
                  title={team.name}
                  icon={{
                    source: team.logo,
                    mask: Image.Mask.Circle,
                  }}
                />
              ))}
        </List.Dropdown>
      }
    />
  );
}
