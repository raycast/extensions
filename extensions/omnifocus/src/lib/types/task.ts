export type OmniFocusTask = {
  id: string;
  name: string;
  completed: boolean;
  flagged: boolean;
  note?: string;
  deferDate?: Date;
  dueDate?: Date;
  dropped: boolean;
  tags: string[];
};

export type CreateOmniFocusTaskOptions = {
  name: string;
  flagged?: boolean;
  note?: string;
  deferDate?: Date | null;
  dueDate?: Date | null;
  projectName?: string;
  tags: string[];
};
