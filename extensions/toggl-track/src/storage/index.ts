import dayjs from "dayjs";
import api from "../toggl";
import { Client, Project, Tag, TimeEntry, Workspace } from "../toggl/types";
import persistedStorage from "./persistedStorage";
import { TogglStorage } from "./types";

function allWorkspacesFetch<T>(workSpaceFunction: (workspaceId: number) => Promise<T[] | null>) {
  return async () => {
    const workspaces = await storage.workspaces.get();
    const data = await Promise.all(
      workspaces.map(async (workspace) => {
        const workspaceData = await workSpaceFunction(workspace.id);
        return workspaceData || [];
      })
    );
    return data.flat();
  };
}

export const storage: TogglStorage = {
  projects: persistedStorage({
    key: "projects",
    fetch: allWorkspacesFetch(api.getWorkspaceProjects),
    expirySeconds: 60,
  }),
  workspaces: persistedStorage({
    key: "workspaces",
    fetch: api.getWorkspaces,
    expirySeconds: 3600,
  }),
  clients: persistedStorage({
    key: "clients",
    fetch: allWorkspacesFetch(api.getWorkspaceClients),
    expirySeconds: 60,
  }),
  runningTimeEntry: persistedStorage({
    key: "runningTimeEntry",
    fetch: api.getRunningTimeEntry,
    expirySeconds: 10,
  }),
  tags: persistedStorage({
    key: "tags",
    fetch: allWorkspacesFetch(api.getWorkspaceTags),
    expirySeconds: 60 * 5,
  }),
  timeEntries: persistedStorage({
    key: "timeEntries",
    fetch: () =>
      api.getTimeEntries({
        startDate: dayjs().subtract(1, "week").toDate(),
        endDate: dayjs().toDate(),
      }),
    expirySeconds: 60 * 5,
  }),
};

export type StorageValues = {
  projects: Project[];
  workspaces: Workspace[];
  clients: Client[];
  tags: Tag[];
  runningTimeEntry: TimeEntry | null;
  timeEntries: TimeEntry[];
};

export async function getStorage(): Promise<StorageValues> {
  return {
    projects: await storage.projects.get(),
    workspaces: await storage.workspaces.get(),
    clients: await storage.clients.get(),
    tags: await storage.tags.get(),
    runningTimeEntry: await storage.runningTimeEntry.get(),
    timeEntries: await storage.timeEntries.get(),
  };
}

export async function refreshStorage(): Promise<void> {
  await Promise.all([
    storage.projects.refresh(),
    storage.workspaces.refresh(),
    storage.clients.refresh(),
    storage.tags.refresh(),
    storage.runningTimeEntry.refresh(),
    storage.timeEntries.refresh(),
  ]);
}
