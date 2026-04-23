export type CreateTaskInput = {
  title: string;
  description?: string;
  due?: string;
  timeZone?: string;
  priority?: number;
  taskListId?: string;
};
