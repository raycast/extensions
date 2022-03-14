import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { WorkflowyFavourite, WorkflowyNode } from "./types";

interface WorkflowyResponse {
  projectTreeData: {
    mainProjectTreeInfo: {
      rootProjectChildren: WorkflowyNode[];
    };
  };
}

async function fetchNodes(sessionId: string) {
  const res = await fetch("https://workflowy.com/get_initialization_data?client_version=21&client_version_v2=28", {
    headers: {
      accept: "application/json",
      cookie: `sessionid=${sessionId};`,
    },
    method: "GET",
  });
  const payload = (await res.json()) as WorkflowyResponse;

  const roots = payload.projectTreeData.mainProjectTreeInfo.rootProjectChildren;

  const parentToChildren: Record<string, string[]> = {};
  const queue = [{ id: "root", nm: "Home", ch: roots }] as WorkflowyNode[];
  const nodes = {} as Record<string, WorkflowyNode>;
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    nodes[node.id] = node;

    if (node.ch) {
      parentToChildren[node.id] = node.ch.map((child) => child.id);
      queue.push(...node.ch.map((child) => ({ ...child, parentId: node.id })));
    }
  }

  return { nodes, parentToChildren };
}

async function fetchSettings(sessionId: string) {
  const res = await fetch("https://workflowy.com/get_user_data/", {
    headers: {
      accept: "application/json",
      cookie: `sessionid=${sessionId};`,
    },
    referrerPolicy: "no-referrer",
    body: null,
    method: "GET",
  });
  const payload: any = await res.json();
  return payload.settings;
}

export async function workflowyFetcher() {
  const { sessionID } = getPreferenceValues();
  const [nodes, settings] = await Promise.all([fetchNodes(sessionID), fetchSettings(sessionID)]);
  const favourites: WorkflowyFavourite[] = JSON.parse(settings.saved_views_json);
  return { ...nodes, favourites };
}
