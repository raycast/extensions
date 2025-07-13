export interface BaseTask {
  id: string;
  custom_id: string | null;
  custom_item_id: number;
  name: string;
  text_content: null | string;
  description: null | string;
  status: Status;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;
  archived: boolean;
  creator: Creator;
  assignees: AssigneesItem[];
  watchers: WatchersItem[];
  checklists: ChecklistItem[];
  tags: TagsItem[];
  parent: string | null;
  priority: Priority | null;
  due_date: string | null;
  start_date: string | null;
  points: null;
  time_estimate: number | null;
  time_spent?: number;
  custom_fields?: CustomField[];
  dependencies: DependenciesItem[];
  linked_tasks: LinkedTask[];
  team_id: string;
  url: string;
  permission_level: string;
  list: List;
  project: Project;
  folder: Folder;
  space: Space;
}
export interface Task extends BaseTask {
  attachments?: unknown[];
}
interface Status {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}
interface Creator {
  id: number;
  username: string;
  color: string;
  email: string;
  profilePicture: string | null;
}
interface WatchersItem {
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
interface Priority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
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
interface CustomField {
  id: string;
  name: string;
  type: string;
  type_config:
    | {
        single_user: boolean;
        include_groups: boolean;
        include_guests: boolean;
        include_team_members: boolean;
      }
    | Record<string, never>;
  date_created: string;
  hide_from_guests: boolean;
  value:
    | {
        id: number;
        username: string;
        email: string;
        color: string;
        initials: string;
        profilePicture: string;
      }
    | string;
  required: boolean;
}
interface DependenciesItem {
  task_id: string;
  depends_on: string;
  type: number;
  date_created: string;
  userid: string;
  workspace_id: string;
  chain_id: string | null;
}
interface LinkedTask {
  task_id: string;
  link_id: string;
  date_created: string;
  userid: string;
  workspace_id: string;
}
interface AssigneesItem {
  id: number;
  username: string;
  color: string;
  initials: string;
  email: string;
  profilePicture: string | null;
}
interface ChecklistItem {
  id: string;
  task_id: string;
  name: string;
  date_created: string;
  orderindex: number;
  creator: number;
  resolved: number;
  unresolved: number;
  items: ChecklistSubItem[];
}
interface ChecklistSubItem {
  id: string;
  name: string;
  orderindex: number;
  assignee: AssigneesItem;
  group_assignee: null;
  resolved: boolean;
  parent: string | null;
  date_created: string;
  children: ChecklistSubItem[];
}
