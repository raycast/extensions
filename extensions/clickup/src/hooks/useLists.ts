import { useCachedPromise } from "@raycast/utils";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";
import { getClickUpClient } from "../api/clickup";
import { ClickUpList, ClickUpSpace } from "../types/clickup";

interface ListWithSpace extends ClickUpList {
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

    const result: ListsBySpace[] = [];

    for (const team of teams) {
      const spaces = await client.getSpaces(team.id);

      for (const space of spaces) {
        const lists: ListWithSpace[] = [];

        const folderlessLists = await client.getFolderlessLists(space.id);
        for (const list of folderlessLists) {
          lists.push({ ...list, spaceName: space.name });
        }

        const folders = await client.getFolders(space.id);
        for (const folder of folders) {
          const folderLists = await client.getLists(folder.id);
          for (const list of folderLists) {
            lists.push({ ...list, spaceName: space.name, folder });
          }
        }

        if (lists.length > 0) {
          result.push({ lists, space });
        }
      }
    }

    return result;
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
