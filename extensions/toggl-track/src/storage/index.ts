import dayjs from "dayjs";
import api from "../toggl";
import { Me, Workspace, Project, Client, Tag, Task, TimeEntry } from "../toggl/types";
import persistedStorage from "./persistedStorage";
import { TogglStorage } from "./types";

function allWorkspacesFetch<T>(workSpaceFunction: (workspaceId: number) => Promise<T[] | null>) {
  return async () => {
    const workspaces = await storage.workspaces.get();
    const data = await Promise.all(
      workspaces.map(async (workspace) => {
        const workspaceData = await workSpaceFunction(workspace.id);
        return workspaceData || [];
      }),
    );
    return data.flat();
  };
}

export const storage: TogglStorage = {
  me: persistedStorage({
    key: "me",
    fetch: api.getMe,
    expirySeconds: 3600,
  }),
  workspaces: persistedStorage({
    key: "workspaces",
    fetch: api.getWorkspaces,
    expirySeconds: 3600,
  }),
  projects: persistedStorage({
    key: "projects",
    fetch: allWorkspacesFetch(api.getWorkspaceProjects),
    expirySeconds: 60,
  }),
  clients: persistedStorage({
    key: "clients",
    fetch: allWorkspacesFetch(api.getWorkspaceClients),
    expirySeconds: 60,
  }),
  tags: persistedStorage({
    key: "tags",
    fetch: allWorkspacesFetch(api.getWorkspaceTags),
    expirySeconds: 60 * 5,
  }),
  tasks: persistedStorage({
    key: "tasks",
    fetch: allWorkspacesFetch(api.getTasks),
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
  runningTimeEntry: persistedStorage({
    key: "runningTimeEntry",
    fetch: api.getRunningTimeEntry,
    expirySeconds: 10,
  }),
};

export type StorageValues = {
  me: Me | null;
  workspaces: Workspace[];
  projects: Project[];
  clients: Client[];
  tags: Tag[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  runningTimeEntry: TimeEntry | null;
};

export async function getStorage(): Promise<StorageValues> {
  return {
    me: await storage.me.get(),
    workspaces: await storage.workspaces.get(),
    projects: await storage.projects.get(),
    clients: await storage.clients.get(),
    tags: await storage.tags.get(),
    tasks: await storage.tasks.get(),
    timeEntries: await storage.timeEntries.get(),
    runningTimeEntry: await storage.runningTimeEntry.get(),
  };
}

export async function refreshStorage(): Promise<void> {
  await Promise.all([
    storage.me.refresh(),
    storage.workspaces.refresh(),
    storage.projects.refresh(),
    storage.clients.refresh(),
    storage.tags.refresh(),
    storage.tasks.refresh(),
    storage.timeEntries.refresh(),
    storage.runningTimeEntry.refresh(),
  ]);
}
