import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpList, ClickUpSpace } from "../types/clickup";

interface ListsBySpace {
  lists: ClickUpList[];
  space: ClickUpSpace;
}

type UseListsResult = Pick<UseCachedPromiseReturnType<ListsBySpace[], never[]>, "error" | "isLoading"> & {
  listsBySpace: ListsBySpace[];
};

/**
 * Hook to fetch all lists grouped by space
 */
export function useLists(): UseListsResult {
  const fetchLists = async (): Promise<ListsBySpace[]> => {
    const client = getClickUpClient();

    const teams = await client.getTeams();
    if (teams.length === 0) {
      return [];
    }

    const spacesResults = await Promise.all(
      teams.map(async (team) => {
        const spaces = await client.getSpaces(team.id);
        return { spaces, team };
      }),
    );

    const allListsBySpace = await Promise.all(
      spacesResults.flatMap(({ spaces, team }) =>
        spaces.map(async (space) => {
          const [spaceLists, folders] = await Promise.all([
            client.getSpaceLists(space.id),
            client.getSpaceFolders(space.id),
          ]);

          const folderListsPromises = folders.map((folder) =>
            client.getFolderLists(folder.id).then((lists) => ({ folder, lists })),
          );

          const folderListsResults = await Promise.all(folderListsPromises);

          const lists: ClickUpList[] = [
            ...spaceLists.map((list) => ({ ...list, team_id: team.id })),
            ...folderListsResults.flatMap(({ folder, lists }) =>
              lists.map((list) => ({ ...list, folder, team_id: team.id })),
            ),
          ];

          return lists.length > 0 ? { lists, space } : null;
        }),
      ),
    );

    return allListsBySpace.filter((item): item is ListsBySpace => item !== null);
  };

  const { data, error, isLoading } = useCachedPromise(fetchLists, [], { initialData: [] });

  return { error, isLoading, listsBySpace: data || [] };
}
