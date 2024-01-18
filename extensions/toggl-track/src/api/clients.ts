import { get } from "./togglClient";

export function getClients(workspaceId: number) {
  return get<Client[] | null>(`/workspaces/${workspaceId}/clients`);
}

// https://developers.track.toggl.com/docs/api/clients#response
export interface Client {
  id: number;
  name: string;
}
