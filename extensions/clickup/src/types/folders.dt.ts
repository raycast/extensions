export interface FoldersResponse {
  folders: FolderItem[];
}
export interface FolderItem {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: Space;
  task_count: string;
  archived: boolean;
  statuses: StatusesItem[];
  lists: ListsItem[];
  permission_level: string;
}
interface Space {
  id: string;
  name: string;
  access?: boolean;
}
interface StatusesItem {
  id: string;
  status: string;
  type: string;
  orderindex: number;
  color: string;
}
interface ListsItem {
  id: string;
  name: string;
  orderindex: number;
  status: Status | null;
  priority: null;
  assignee: null;
  task_count: number;
  due_date: null | string;
  start_date: null | string;
  space: Space;
  archived: boolean;
  override_statuses: boolean;
  statuses: StatusesItem[];
  permission_level: string;
  content?: string;
}
interface Status {
  status: string;
  color: string;
  hide_label: boolean;
}
