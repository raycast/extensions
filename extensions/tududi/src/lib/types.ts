export interface Project {
  id: number;
  uid: string;
  name: string;
}

export interface Tag {
  id?: number;
  uid: string;
  name: string;
  color?: string;
  tag_type?: string;
}

export interface Task {
  id: number;
  uid: string;
  name: string;
  original_name?: string;
  note?: string;
  status: number;
  priority: number;
  due_date?: string | null;
  defer_until?: string | null;
  project_id?: number | null;
  project_uid?: string | null;
  tags?: Tag[];
  Project?: Project | null;
  today_move_count?: number;
}

export interface Note {
  id: number;
  uid: string;
  title: string;
  content: string;
  project_id?: number | null;
  project_uid?: string | null;
  tags?: Tag[];
  Tags?: Tag[];
  Project?: Project | null;
}

export interface TasksResponse {
  tasks: Task[];
  tasks_today_plan?: Task[];
  tasks_due_today?: Task[];
  tasks_overdue?: Task[];
  suggested_tasks?: Task[];
  tasks_completed_today?: Task[];
}

export interface ProjectsResponse {
  projects: Project[];
}
