import { get, post, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";

export function getMyClients() {
  return get<Client[]>("/me/clients");
}

export function createClient(workspaceId: number, name: string) {
  return post<Client>(`/workspaces/${workspaceId}/clients`, { wid: workspaceId, name });
}

export function updateClient(workspaceId: number, clientId: number, name: string) {
  return put<Client>(`/workspaces/${workspaceId}/clients/${clientId}`, { wid: workspaceId, name });
}

export function deleteClient(workspaceId: number, clientId: number) {
  return remove(`/workspaces/${workspaceId}/clients/${clientId}`);
}

export function archiveClient(workspaceId: number, clientId: number) {
  return post(`/workspaces/${workspaceId}/clients/${clientId}/archive`);
}

export function restoreClient(workspaceId: number, clientId: number, restoreAllProjects: boolean) {
  return post(`/workspaces/${workspaceId}/clients/${clientId}/restore`, { restore_all_projects: restoreAllProjects });
}

/** @see {@link https://developers.track.toggl.com/docs/api/clients#response Toggl Api} */
export interface Client extends ToggleItem {
  archived: boolean;
  name: string;
  /** Workspace ID */
  wid: number;
}
