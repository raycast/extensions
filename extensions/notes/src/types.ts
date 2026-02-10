export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: number;
}
