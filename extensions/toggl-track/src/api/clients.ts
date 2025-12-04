import { get, post, put, remove } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";
import { cacheHelper } from "@/helpers/cache-helper";

export function getMyClients() {
  return cacheHelper.getOrSet("clients", () => get<Client[]>("/me/clients"));
}

export function createClient(workspaceId: number, name: string) {
  return cacheHelper.upsert("clients", () =>
    post<Client>(`/workspaces/${workspaceId}/clients`, { wid: workspaceId, name }),
  );
}

export function updateClient(workspaceId: number, clientId: number, name: string) {
  return cacheHelper.upsert("clients", () =>
    put<Client>(`/workspaces/${workspaceId}/clients/${clientId}`, { wid: workspaceId, name }),
  );
}

export async function deleteClient(workspaceId: number, clientId: number) {
  await remove(`/workspaces/${workspaceId}/clients/${clientId}`);
  cacheHelper.removeItem("clients", clientId);
  return;
}

export async function archiveClient(workspaceId: number, clientId: number) {
  await post(`/workspaces/${workspaceId}/clients/${clientId}/archive`);

  const cacheClients = cacheHelper.get<Client[]>("clients");
  if (cacheClients) {
    const updatedClients = cacheClients.map((client) =>
      client.id === clientId ? { ...client, archived: true } : client,
    );
    cacheHelper.set("clients", updatedClients);
  }
}

export async function restoreClient(workspaceId: number, clientId: number, restoreAllProjects: boolean) {
  await post(`/workspaces/${workspaceId}/clients/${clientId}/restore`, { restore_all_projects: restoreAllProjects });

  const cacheClients = cacheHelper.get<Client[]>("clients");
  if (cacheClients) {
    const updatedClients = cacheClients.map((client) =>
      client.id === clientId ? { ...client, archived: false } : client,
    );
    cacheHelper.set("clients", updatedClients);
  }
  if (restoreAllProjects) {
    cacheHelper.remove("projects");
  }
}

/** @see {@link https://developers.track.toggl.com/docs/api/clients#response Toggl Api} */
export interface Client extends ToggleItem {
  archived: boolean;
  name: string;
  /** Workspace ID */
  wid: number;
}
