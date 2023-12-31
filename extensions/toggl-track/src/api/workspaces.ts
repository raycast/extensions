import { get } from "./toggleClient";
import { Workspace } from "./types";

export function getWorkspaces() {
  return get<Workspace[]>("/workspaces");
}
