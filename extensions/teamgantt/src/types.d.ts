export interface MyPreferences {
  password: string;
  username: string;
  clientSecret: string;
  clientId: string;
}

export interface Task {
  id: number;
  name: string;
  type: 'task' | 'milestone';
  project_id: string;
  project_name: string;
  parent_group_name: string;
  percent_complete: number;
  is_starred: boolean;
  end_date: string;
  resources: { name: string }[];
}

export interface TimeBlock {
  id: number;
  task_id: number;
  type: 'punched' | 'time-sheet';
}

export interface Comment {
  type: 'note' | 'comment';
  message?: string;
  added_by: User;
  is_read: boolean;
  added_date: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email_address: string;
  pic?: string;
  status: 'active';
}
