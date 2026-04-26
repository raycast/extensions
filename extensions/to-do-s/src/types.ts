export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface AppData {
  categories: Category[];
  todos: Record<string, Todo[]>; // categoryId -> todos
}
