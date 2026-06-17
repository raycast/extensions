import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import {
  ExtendedWindmillWorkspacePair,
  WindmillItem,
  WindmillListItem,
  WindmillListItemExtended,
  WindmillWorkspacePairArray,
  WorkspaceConfig,
} from "../types";
import { getCache, setCache } from "../cache";
import { Kind } from "../types";

export function useFetchList(kind: Kind, workspaces: WorkspaceConfig[]) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshItems = async () => {
    try {
      setIsLoading(true);
      const items = await getItems(kind, workspaces, true);
      setItems(items);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshItems();
  }, [workspaces]);

  return { items, setItems, refreshItems, isLoading };
}

async function getItems(kind: Kind, workspaces: WorkspaceConfig[], force = false) {
  let items = [];
  const cacheKey = `${kind}:` + workspaces.map((workspace: WorkspaceConfig) => `${workspace.workspaceId}`).join(":");

  if (!force) {
    items = getCache(cacheKey);
    if (items) {
      return items;
    }
  }

  const fetches = workspaces.map((workspace: WorkspaceConfig) =>
    fetch(`${workspace.remoteURL}api/w/${workspace.workspaceId}/${kind}s/list`, {
      headers: {
        Authorization: `Bearer ${workspace.workspaceToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((data) => ({ data, workspace }))
  );

  const fetchResults = await Promise.all(fetches);

  items = fetchResults.flatMap(
    (fetch) => (fetch.data as WindmillItem[])?.map((item) => [item, fetch.workspace]) ?? []
  ) as WindmillWorkspacePairArray[];

  const extendedItems = await convertToExtended(items, kind);

  extendedItems.sort((a, b) => {
    if (a[0].starred && !b[0].starred) return -1;
    if (!a[0].starred && b[0].starred) return 1;
    const aDate = a[0].newest_date ? new Date(a[0].newest_date) : new Date();
    const bDate = b[0].newest_date ? new Date(b[0].newest_date) : new Date();
    return bDate.getTime() - aDate.getTime();
  });

  setCache(cacheKey, extendedItems);

  return extendedItems;
}

async function convertToExtended(
  items: WindmillWorkspacePairArray[],
  kind: Kind
): Promise<ExtendedWindmillWorkspacePair[]> {
  const extendedItems: ExtendedWindmillWorkspacePair[] = [];
  for (const workspacePair of items) {
    const item = workspacePair[0];
    extendedItems.push([await formatItem(item, kind), workspacePair[1]]);
  }
  return extendedItems;
}

async function formatItem(item: WindmillListItem, kind: Kind): Promise<WindmillListItemExtended> {
  const storage_last_exec_time = (await LocalStorage.getItem(`${kind}:${item.path}:last_exec_time`)) as
    | string
    | undefined;
  let edited_at: Date | undefined;
  let edited_at_locale;
  let newest_date;
  let last_exec_time: Date | undefined;

  if (item.edited_at) {
    edited_at = new Date(item.edited_at);
    edited_at_locale = edited_at?.toLocaleString();
  }

  if (storage_last_exec_time) {
    const lastExecTimeDate = new Date(storage_last_exec_time);
    if (!isNaN(lastExecTimeDate.getTime())) {
      last_exec_time = lastExecTimeDate;
    }
  }
  if (last_exec_time && edited_at) {
    newest_date = new Date(Math.max((edited_at as Date).getTime(), (last_exec_time as Date).getTime()));
  } else if (edited_at) {
    newest_date = edited_at as Date;
  }

  const newItem: WindmillListItemExtended = { ...item, kind, edited_at, edited_at_locale, newest_date, last_exec_time };
  return newItem;
}
