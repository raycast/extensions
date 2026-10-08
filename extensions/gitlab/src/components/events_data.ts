import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { Event } from "./event";

async function loadProjectsById(projectIds: number[]): Promise<Map<number, Project>> {
  const projectById = new Map<number, Project>();
  if (projectIds.length === 0) {
    return projectById;
  }

  const memberProjects = await gitlab.getUserProjects({ membership: "true" }, true);
  for (const project of memberProjects) {
    projectById.set(project.id, project);
  }

  const missingIds = projectIds.filter((projectId) => !projectById.has(projectId));
  if (missingIds.length > 0) {
    const fetchedProjects = await Promise.all(
      missingIds.map((projectId) => gitlab.getProject(projectId).catch(() => undefined)),
    );
    for (const project of fetchedProjects) {
      if (project) {
        projectById.set(project.id, project);
      }
    }
  }

  return projectById;
}

export async function enrichEventsWithProjects(events: Event[]): Promise<Event[]> {
  if (events.length === 0) {
    return events;
  }

  const projectIds = [...new Set(events.map((event) => event.project_id))];
  const projectById = await loadProjectsById(projectIds);

  return events.map((event) => ({
    ...event,
    project: projectById.get(event.project_id),
  }));
}

export async function fetchEventsWithProjects(params: Record<string, string> = {}): Promise<Event[]> {
  const events = (await gitlab.fetch("events", params)) as Event[];
  return enrichEventsWithProjects(events);
}

export async function fetchPushEventsWithProjects(): Promise<Event[]> {
  const events = await fetchEventsWithProjects({ action: "pushed" });
  return events.filter((event) => event.action_name === "pushed to" || event.action_name === "pushed new");
}
