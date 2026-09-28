export interface Calendar {
  id: string;
  accountId: string;
  integrationId?: string;
  name: string;
  color?: string;
  myRights?: {
    mayReadItems?: boolean;
    mayWriteAll?: boolean;
    mayWriteOwn?: boolean;
    mayDelete?: boolean;
  };
  "morgen.so:metadata"?: { overrideName?: string; overrideColor?: string };
}

export interface Event {
  id: string;
  accountId: string;
  calendarId: string;
  title: string;
  description?: string;
  descriptionContentType?: string;
  start: string;
  timeZone: string | null;
  duration: string;
  showWithoutTime: boolean;
  masterEventId?: string;
  recurrenceId?: string;
  "morgen.so:metadata"?: { taskId?: string };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due?: string;
  timeZone?: string;
  estimatedDuration?: string;
  priority?: number;
  progress?: string;
  taskListId?: string;
  deleted?: boolean;
}
