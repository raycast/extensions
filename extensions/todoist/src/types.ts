import { Task } from "@doist/todoist-api-typescript";

export enum ViewMode {
  project,
  date,
  search,
}

export interface SectionWithTasks {
  name: string;
  tasks: Task[];
}
