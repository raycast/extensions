import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import fetch from "node-fetch";
import {
  ExtendedWindmillWorkspacePair,
  WindmillListItemExtended,
  WindmillWorkspacePairArray,
  WorkspaceConfig,
  WindmillListItem,
  ScriptListItem,
  VariableListItem,
  UserListItem,
  ScriptListItemExtended,
  FlowListItemExtended,
  AppListItemExtended,
  RawAppListItemExtended,
  VariableListItemExtended,
  ResourceListItemExtended,
  UserListItemExtended,
  FolderListItemExtended,
  GroupListItemExtended,
  ScheduleListItemExtended,
} from "../types";
import { getCache, setCache } from "../cache";
import { Kind } from "../types";

type KindOutputMap = {
  script: ScriptListItemExtended;
  flow: FlowListItemExtended;
  app: AppListItemExtended;
  raw_app: RawAppListItemExtended;
  variable: VariableListItemExtended;
  resource: ResourceListItemExtended;
  user: UserListItemExtended;
  folder: FolderListItemExtended;
  group: GroupListItemExtended;
  schedule: ScheduleListItemExtended;
};

export function useFetchList<K extends keyof KindOutputMap>(kind: K, workspaces: WorkspaceConfig[]) {
  const [items, setItems] = useState<[KindOutputMap[K], WorkspaceConfig][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshItems = useCallback(
    async (force_workspaces: WorkspaceConfig[] = []) => {
      try {
        setIsLoading(true);
        for await (const items of getItems(kind, workspaces, force_workspaces)) {
          setItems(items);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaces]
  );

  useEffect(() => {
    refreshItems([]);
  }, [workspaces]);

  return { items, setItems, refreshItems, isLoading };
}

async function* getItems<K extends keyof KindOutputMap>(
  kind: K,
  workspaces: WorkspaceConfig[],
  force_workspaces: WorkspaceConfig[] = []
): AsyncIterable<[KindOutputMap[K], WorkspaceConfig][]> {
  let items: [KindOutputMap[K], WorkspaceConfig][] = [];
  const cacheKey = `${kind}s`;

  items = getCache(cacheKey);
  if (items) {
    items = items.filter(([_, workspace]) => workspaces.includes(workspace));
    yield items;
  } else {
    items = [];
  }

  let baseItems = [...items] as WindmillWorkspacePairArray[];
  for (const workspace of workspaces) {
    // if we already have an item for this workspace and we're not forcing a refresh for that workspace, skip the workspace
    if (items.some((item) => item[1].id === workspace.id)) {
      if (force_workspaces.includes(workspace)) {
        baseItems = baseItems.filter((item) => item[1].id !== workspace.id);
      } else {
        continue;
      }
    }
    const response = await fetch(`${workspace.remoteURL}api/w/${workspace.workspaceId}/${kind}s/list`, {
      headers: {
        Authorization: `Bearer ${workspace.workspaceToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as WindmillListItem[];
    baseItems = [...baseItems, ...(data?.map((item) => [item, workspace] as WindmillWorkspacePairArray) ?? [])];

    const extendedItems = await convertToExtended(baseItems, kind);

    extendedItems.sort((a, b) => {
      if ("starred" in a[0] && a[0].starred && !("starred" in b[0] && b[0].starred)) return -1;
      if (!("starred" in a[0] && a[0].starred) && "starred" in b[0] && b[0].starred) return 1;

      const aDate = a[0].newest_date ? new Date(a[0].newest_date) : new Date();
      const bDate = b[0].newest_date ? new Date(b[0].newest_date) : new Date();
      return bDate.getTime() - aDate.getTime();
    });

    yield extendedItems as [KindOutputMap[K], WorkspaceConfig][];
    setCache(cacheKey, extendedItems);
  }
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
  let key = "";

  if (kind === "script" || kind === "flow" || kind === "app" || kind === "raw_app") {
    key = `${kind}:${(item as ScriptListItem).path}`;
  }
  if (kind === "variable" || kind === "resource") {
    key = `${kind}:${(item as VariableListItem).path}`;
  }
  if (kind === "user") {
    key = `${kind}:${(item as UserListItem).username}`;
  }

  const storage_last_exec_time = (await LocalStorage.getItem(`${key}:last_exec_time`)) as string | undefined;
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

  return { ...item, kind, edited_at, edited_at_locale, newest_date, last_exec_time } as WindmillListItemExtended;
}
