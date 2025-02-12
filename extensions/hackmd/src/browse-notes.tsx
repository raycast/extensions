import { Icon, Image, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo } from "react";
import NotesList from "./components/NotesList";
import api from "./lib/api";

export default function BrowseNotes() {
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
    } else {
      return myNotes;
    }
  }, [teamPath, data, myNotes]);

  const mutateFn = useMemo(() => {
    if (teamPath) {
      return mutate;
    } else {
      return mutateMyNotes;
    }
  }, [teamPath, mutate, mutateMyNotes]);

  const isNotesLoading = useMemo(() => {
    if (teamPath) {
      return isTeamNotesLoading;
    } else {
      return isMyNotesLoading;
    }
  }, [teamPath, isTeamNotesLoading, isMyNotesLoading]);

  return (
    <NotesList
      notes={notes}
      mutate={mutateFn}
      isLoading={isNotesLoading}
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
