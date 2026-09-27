import type { Project } from "../../domain/project";
import type { Task } from "../../domain/task";

export const inboxProject: Project = {
  id: "project-inbox",
  name: "Inbox",
  kind: "inbox",
  closed: false,
};

export const workProject: Project = {
  id: "project-work",
  name: "Work Projects",
  kind: "project",
  closed: false,
};

export function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-default",
    projectId: inboxProject.id,
    projectName: inboxProject.name,
    title: "Synthetic task",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: false,
    timeZone: "UTC",
    ...overrides,
  };
}
