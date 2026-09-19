import type { Label, Project, Task } from "./model";

export interface TaskRepository {
  transaction<T>(operation: () => T): T;

  getProject(id: string): Project | null;
  listProjects(): Project[];
  insertProject(project: Project): void;
  updateProject(project: Project): void;
  deleteProject(id: string): void;

  getLabel(id: string): Label | null;
  listLabels(): Label[];
  insertLabel(label: Label): void;
  updateLabel(label: Label): void;
  deleteLabel(id: string): void;

  getTask(id: string): Task | null;
  listTasks(): Task[];
  insertTask(task: Task): void;
  updateTask(task: Task): void;
}
