export interface Task {
  id: string;
  title: string;
  priority: 0 | 1 | 3 | 5 | undefined;
  projectId: string;
}

export interface Section {
  id: string;
  name: string;
  children: Task[];
}
