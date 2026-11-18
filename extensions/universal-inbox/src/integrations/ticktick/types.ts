export enum TickTickItemPriority {
  None = 0,
  Low = 1,
  Medium = 3,
  High = 5,
}

export enum TickTickTaskStatus {
  Normal = 0,
  Completed = 2,
}

export interface TickTickTag {
  name: string;
  color?: string;
}

export interface TickTickChecklistItem {
  id: string;
  title: string;
  status: TickTickTaskStatus;
  sortOrder?: number;
}

export interface TickTickItem {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  allDay?: boolean;
  startDate?: string;
  dueDate?: string;
  priority: TickTickItemPriority;
  status: TickTickTaskStatus;
  tags?: TickTickTag[];
  items?: TickTickChecklistItem[];
}

export function getTickTickItemHtmlUrl(item: TickTickItem): string {
  return `https://ticktick.com/webapp/#p/${item.projectId}/tasks/${item.id}`;
}
