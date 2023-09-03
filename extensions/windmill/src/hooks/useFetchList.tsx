import { LocalStorage, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { WorkspaceConfig } from "../types";
import { getCache, setCache } from '../cache';
import { Kind } from "../types";

export function useFetchList(kind: Kind, workspaces: WorkspaceConfig[]) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAndProcessData = async () => {
      setLoading(true)
      const items = await getItems(kind, workspaces);
      setItems(items);
      setLoading(false)
    };

    fetchAndProcessData();
  }, [workspaces]);

  const refreshItems = async () => {
    setLoading(true);
    const items = await getItems(kind, workspaces, true);
    setItems(items);
    setLoading(false);
  };

  return { items, setItems, refreshItems, loading };
}

type Item = any;


async function getItems(kind: Kind, workspaces: WorkspaceConfig[], force = false) {
  let items = [];
  const cacheKey = `${kind}:` + workspaces.map((workspace: WorkspaceConfig) => `${workspace.workspaceId}`).join(":");

  if (!force) {
    items = getCache(cacheKey);
    if (items) {
      return items;
    }
  }

  const fetches = workspaces.map((workspace: WorkspaceConfig) => fetch(`${workspace.remoteURL}api/w/${workspace.workspaceId}/${kind}s/list`, {
    headers: {
      Authorization: `Bearer ${workspace.workspaceToken}`,
      "Content-Type": "application/json"
    },
  }).then(r => r.json()).then(data => ({ data, workspace })));

  const fetchResults = await Promise.all(fetches);

  items = fetchResults.flatMap(fetch => (fetch.data as Item[])?.map((item: Item) => [item, fetch.workspace]) ?? []) as any[];

  for (let item of items) {
    const last_exec_time = await LocalStorage.getItem(`${kind}:${item.path}:last_exec_time`);
    item.edited_at_locale = null

    if (item.edited_at) {
      item.edited_at = new Date(item.edited_at);
      item.edited_at_locale = item.edited_at?.toLocaleString();
    }

    if (last_exec_time && typeof last_exec_time !== 'boolean') {
      const lastExecTimeDate = new Date(last_exec_time);
      if (!isNaN(lastExecTimeDate.getTime())) {
        item.last_exec_time = lastExecTimeDate;
      }
    }
    if (item.last_exec_time) {
      item.newest_date = new Date(Math.max(item.edited_at.getTime(), item.last_exec_time.getTime()));
    } else {
      item.newest_date = item.edited_at;
    }

  }
  items.sort((a, b) => {
    if (a[0].starred && !b[0].starred) return -1;
    if (!a[0].starred && b[0].starred) return 1;
    return new Date(b[0].newest_date).getTime() - new Date(a[0].newest_date).getTime();
  });

  setCache(cacheKey, items);

  return items;
}
