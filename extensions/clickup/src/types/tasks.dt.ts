export interface TasksResponse {
  tasks: TaskItem[];
}
export interface TaskItem {
  id: string;
  custom_id: null;
  name: string;
  text_content: null | string;
  description: null | string;
  status: Status;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: null;
  archived: boolean;
  creator: Creator;
  assignees: AssigneesItem[];
  watchers: any[];
  checklists: any[];
  tags: TagsItem[];
  parent: null;
  priority: null | Priority;
  due_date: null | string;
  start_date: null;
  points: null;
  time_estimate: null | number;
  custom_fields: any[];
  dependencies: DependenciesItem[];
  linked_tasks: any[];
  team_id: string;
  url: string;
  permission_level: string;
  list: List;
  project: Project;
  folder: Folder;
  space: Space;
}
interface Status {
  status: string;
  color: string;
  type: string;
  orderindex: number;
}
interface Creator {
  id: number;
  username: string;
  color: string;
  email: string;
  profilePicture: string | null;
}
interface AssigneesItem {
  id: number;
  username: string;
  color: string;
  initials: string;
  email: string;
  profilePicture: string | null;
}
interface TagsItem {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator: number;
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
interface DependenciesItem {
  task_id: string;
  depends_on: string;
  type: number;
  date_created: string;
  userid: string;
}
interface Priority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}
