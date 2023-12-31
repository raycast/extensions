import { get } from "./toggleClient";
import { Client } from "./types";

export function getWorkspaceClients(workspaceId: number) {
  return get<Client[] | null>(`/workspaces/${workspaceId}/clients`);
}
