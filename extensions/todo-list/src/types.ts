export interface TodoSections {
  pinned: TodoItem[];
  todo: TodoItem[];
  completed: TodoItem[];
}

export interface TodoItem {
  title: string;
  tag?: string;
  dueDate?: number;
  completed: boolean;
  priority?: 1 | 2 | 3;
  timeAdded: number;
}
