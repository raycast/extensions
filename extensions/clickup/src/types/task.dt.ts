export interface Task {
  id: string;
  custom_id: null;
  name: string;
  text_content: string;
  description: string;
  status: Status;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: null;
  archived: boolean;
  creator: Creator;
  assignees: any[];
  watchers: WatchersItem[];
  checklists: any[];
  tags: TagsItem[];
  parent: null;
  priority: Priority;
  due_date: null;
  start_date: null;
  points: null;
  time_estimate: null;
  time_spent: number;
  custom_fields: any[];
  dependencies: any[];
  linked_tasks: any[];
  team_id: string;
  url: string;
  permission_level: string;
  list: List;
  project: Project;
  folder: Folder;
  space: Space;
  attachments: any[];
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
  profilePicture: string;
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
