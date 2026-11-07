export interface Task {
  id: string;
  title: string;
  status: string;
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
  notes?: string;
  webViewLink?: string;
  assignmentInfo?: AssignmentInfo;
}

export interface AssignmentInfo {
  linkToTask?: string;
  surfaceType?: "SURFACE_TYPE_UNSPECIFIED" | "DOCUMENT" | "SPACE";
  driveResourceInfo?: { driveFileId?: string; resourceKey?: string };
  spaceInfo?: { space?: string };
}

export interface TaskList {
  id: string;
  title: string;
}

export interface TaskWithList extends Task {
  listId: string;
  listTitle: string;
}

export type EditableTask = Pick<Task, "id" | "title" | "notes"> & { due?: string | Date | null };

export interface TaskForm {
  title: string;
  notes?: string;
  due: Date | null;
}
