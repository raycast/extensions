import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpFolder, ClickUpList, ClickUpSpace } from "../types/clickup";

interface ListWithSpace extends ClickUpList {
  folder?: ClickUpFolder;
  spaceName: string;
}

interface ListsBySpace {
  lists: ListWithSpace[];
  space: ClickUpSpace;
}

type FetchListsResult = ListsBySpace[];

type UseListsResult = Pick<UseCachedPromiseReturnType<FetchListsResult, never[]>, "error" | "isLoading"> & {
  listsBySpace: ListsBySpace[];
};

/**
 * Hook to fetch all lists grouped by space
 */
export function useLists(): UseListsResult {
  const fetchLists = async (): Promise<FetchListsResult> => {
    const client = getClickUpClient();
    const teams = await client.getTeams();

    const teamSpaces = await Promise.all(teams.map((team) => client.getSpaces(team.id)));
    const allSpaces = teamSpaces.flat();

    const spaceResults = await Promise.all(
      allSpaces.map(async (space) => {
        const [folderlessLists, folders] = await Promise.all([
          client.getFolderlessLists(space.id),
          client.getFolders(space.id),
        ]);

        const folderListsResults = await Promise.all(folders.map((folder) => client.getLists(folder.id)));

        const lists: ListWithSpace[] = [];

        for (const list of folderlessLists) {
          lists.push({ ...list, spaceName: space.name });
        }

        for (const [index, folder] of folders.entries()) {
          for (const list of folderListsResults[index]) {
            lists.push({ ...list, folder, spaceName: space.name });
          }
        }

        return lists.length > 0 ? { lists, space } : null;
      }),
    );

    return spaceResults.filter((result): result is ListsBySpace => result !== null);
  };

  const { data, error, isLoading } = useCachedPromise(fetchLists, [], {
    initialData: [],
  });

  return {
    error,
    isLoading,
    listsBySpace: data || [],
  };
}
