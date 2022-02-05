import { Task } from "@doist/todoist-api-typescript";

export enum ViewMode {
  project,
  date,
}

export interface SectionWithTasks {
  name: string;
  order?: number;
  tasks: Task[];
}

export enum SWRKeys {
  projects = "projects",
  tasks = "tasks",
  labels = "labels",
  sections = "sections",
}
