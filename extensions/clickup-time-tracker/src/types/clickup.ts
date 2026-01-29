export interface User {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: TeamMember[];
}

export interface TeamMember {
  user: User;
}

export interface Status {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

export interface List {
  id: string;
  name: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Space {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  custom_id: string | null;
  name: string;
  text_content: string | null;
  description: string | null;
  status: Status;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;
  creator: User;
  assignees: User[];
  watchers: User[];
  checklists: unknown[];
  tags: Tag[];
  parent: string | null;
  priority: Priority | null;
  due_date: string | null;
  start_date: string | null;
  points: number | null;
  time_estimate: number | null;
  time_spent: number | null;
  list: List;
  folder: Folder;
  space: Space;
  url: string;
}

export interface Tag {
  name: string;
  tag_fg: string;
  tag_bg: string;
}

export interface Priority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface TimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    status: Status;
    custom_type: string | null;
  } | null;
  wid: string;
  user: User;
  billable: boolean;
  start: string;
  end: string | null;
  duration: string;
  description: string;
  tags: Tag[];
  source: string;
  at: string;
  task_location?: {
    list_id: string;
    folder_id: string;
    space_id: string;
    list_name: string;
    folder_name: string;
    space_name: string;
  };
  task_url?: string;
}

export interface CurrentTimeEntry {
  data: TimeEntry | null;
}

export interface TimeEntriesResponse {
  data: TimeEntry[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface UserResponse {
  user: User;
}

export interface TeamsResponse {
  teams: Team[];
}

export interface StartTimeEntryResponse {
  data: TimeEntry;
}

export interface StopTimeEntryResponse {
  data: TimeEntry;
}
