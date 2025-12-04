import { BaseTask } from "./task.dt";

export interface TasksResponse {
  tasks: TaskItem[];
}
export interface TaskItem extends BaseTask {
  team_id: string;
  url: string;
  permission_level: string;
  list: List;
  project: Project;
  folder: Folder;
  space: Space;
}
interface List {
  id: string;
  name: string;
  access: boolean;
}
interface Project {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}
interface Folder {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}
interface Space {
  id: string;
}
