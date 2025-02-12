export type TaskStatus = "NEW" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED" | "ARCHIVED";

export interface Task {
  id: number;
  title: string;
  notes: string;
  eventCategory: string;
  eventSubType: string;
  status: TaskStatus;
  timeChunksRequired: number;
  timeChunksSpent: number;
  timeChunksRemaining: number;
  minChunkSize: number;
  maxChunkSize: number;
  alwaysPrivate: boolean;
  deleted: boolean;
  index: number;
  due: string;
  created: string;
  updated: string;
  finished: string;
  snoozeUntil: string;
  adjusted: boolean;
  atRisk: boolean;
  priority: string;
  onDeck: boolean;
  instances: Array<{
    taskId: number;
    eventId: string;
    eventKey: string;
    status: string;
    start: string;
    end: string;
    index: number;
    pinned: boolean;
  }>;
  timeSchemeId: string;
  type: string;
  recurringAssignmentType: string;
}
