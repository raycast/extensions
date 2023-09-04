import fetch from "node-fetch";
import { WorkspaceConfig } from "./types";

export async function addStar(path: string, kind: string, workspace: WorkspaceConfig) {
  const response = await fetch(`${workspace.remoteURL}api/w/${workspace.workspaceId}/favorites/star`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workspace.workspaceToken}`,
    },
    body: JSON.stringify({ favorite_kind: kind, path: path }),
  }).then((r) => r.text());
  console.log("addStar", path, workspace);
  console.log(response);
}

export async function removeStar(path: string, kind: string, workspace: WorkspaceConfig) {
  const response = await fetch(`${workspace.remoteURL}api/w/${workspace.workspaceId}/favorites/unstar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workspace.workspaceToken}`,
    },
    body: JSON.stringify({ favorite_kind: kind, path: path }),
  }).then((r) => r.text());
  console.log("removeStar", path, workspace);
  console.log(response);
}
