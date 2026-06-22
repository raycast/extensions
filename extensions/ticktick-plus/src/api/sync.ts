import { apiGet } from "./client";
import { fetchInboxTasks, resolveInboxId, setStoredInboxId } from "./inbox";
import { Task, Project, BatchSyncResponse, ProjectGroup, Tag, Filter } from "../types/ticktick";

interface V1ProjectData {
  project: Project;
  tasks: Task[];
  columns?: unknown[];
}

function mergeTasks(existing: Task[], incoming: Task[]): Task[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const task of incoming) {
    byId.set(task.id, task);
  }
  return Array.from(byId.values());
}

/** Try V2 full sync — returns null if OAuth token can't access it. */
async function tryV2Sync(): Promise<BatchSyncResponse | null> {
  try {
    const response = await apiGet<BatchSyncResponse & { inboxId?: string }>("/api/v2/batch/check/0");
    if (!response?.syncTaskBean) return null;
    return {
      syncTaskBean: response.syncTaskBean,
      projectProfiles: response.projectProfiles ?? [],
      projectGroups: response.projectGroups ?? [],
      tags: response.tags ?? [],
      filters: response.filters ?? [],
      inboxId: response.inboxId ?? "",
      checkPoint: response.checkPoint,
    };
  } catch {
    return null;
  }
}

async function v1Sync(): Promise<BatchSyncResponse> {
  const projects = await apiGet<Project[]>("/open/v1/project");

  const projectDataList = await Promise.all(
    projects.map((p) =>
      apiGet<V1ProjectData>(`/open/v1/project/${p.id}/data`).catch(() => ({
        project: p,
        tasks: [] as Task[],
      })),
    ),
  );

  const allTasks: Task[] = projectDataList.flatMap((pd) => pd.tasks ?? []);
  const { project: inboxProject, tasks: inboxTasks } = await fetchInboxTasks("");

  let inboxId = inboxProject?.id ?? "";
  if (!inboxId) inboxId = await resolveInboxId(projects, allTasks);
  if (!inboxId && inboxTasks[0]?.projectId) inboxId = inboxTasks[0].projectId;
  if (inboxId) await setStoredInboxId(inboxId);

  const finalTasks = mergeTasks(allTasks, inboxTasks);
  const projectProfiles =
    inboxId && !projects.some((p) => p.id === inboxId)
      ? [inboxProject ?? { id: inboxId, name: "Inbox", kind: "INBOX" }, ...projects]
      : projects;

  let tags: Tag[] = [];
  const filters: Filter[] = [];
  let projectGroups: ProjectGroup[] = [];
  try {
    tags = await apiGet<Tag[]>("/open/v1/tag");
  } catch {
    // optional
  }
  try {
    projectGroups = await apiGet<ProjectGroup[]>("/open/v1/project/group");
  } catch {
    // optional
  }

  return { syncTaskBean: { update: finalTasks }, projectProfiles, projectGroups, tags, filters, inboxId };
}

export async function batchSync(): Promise<BatchSyncResponse> {
  const v2 = await tryV2Sync();

  if (v2) {
    let inboxId = v2.inboxId;
    let tasks = v2.syncTaskBean.update ?? [];
    let projects = v2.projectProfiles ?? [];

    // Ensure inbox tasks are included
    const { project: inboxProject, tasks: inboxTasks } = await fetchInboxTasks(inboxId);
    if (!inboxId) {
      inboxId = inboxProject?.id ?? (await resolveInboxId(projects, tasks));
      if (inboxId) await setStoredInboxId(inboxId);
    }
    tasks = mergeTasks(tasks, inboxTasks);
    if (inboxId && !projects.some((p) => p.id === inboxId)) {
      projects = [inboxProject ?? { id: inboxId, name: "Inbox", kind: "INBOX" }, ...projects];
    }

    return { ...v2, syncTaskBean: { update: tasks }, projectProfiles: projects, inboxId };
  }

  return v1Sync();
}
