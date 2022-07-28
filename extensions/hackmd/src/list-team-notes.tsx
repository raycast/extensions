import { Image, List } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useMemo, useEffect } from "react";
import NotesList from "./components/NotesList";
import api from "./lib/api";

export default function ListMyNotes() {
  const { data: user } = usePromise(() => api.getMe());

  const teams = useMemo(() => user?.teams ?? [], [user]);
  const [teamPath, setTeamPath] = useCachedState<string>("team", "");

  useEffect(() => {
    if (!teamPath && teams[0]?.path) {
      setTeamPath(teams[0]?.path);
    }
  }, [teamPath, teams]);

  const { isLoading, data, mutate } = useCachedPromise((path: string) => api.getTeamNotes(path), [teamPath], {
    execute: !!teamPath,
  });

  return (
    <NotesList
      notes={data}
      mutate={mutate}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select a Team" onChange={(path) => setTeamPath(path)} storeValue>
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
