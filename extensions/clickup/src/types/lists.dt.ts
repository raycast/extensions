export interface ListsResponse {
  lists: ListItem[];
}
export interface ListItem {
  id: string;
  name: string;
  orderindex: number;
  status: Status;
  priority: null;
  assignee: null;
  task_count: number;
  due_date: null;
  start_date: null;
  folder: Folder;
  space: Space;
  archived: boolean;
  override_statuses: boolean;
  permission_level: string;
}
export interface List {
  id: string;
  statuses: Omit<Status, "hide_label">[];
}
interface Status {
  status: string;
  color: string;
  hide_label: boolean;
}
interface Folder {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}
interface Space {
  id: string;
  name: string;
  access: boolean;
}
