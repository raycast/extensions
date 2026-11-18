export const TASK_CONTROL_MAX_MINUTES = 365 * 24 * 60;
export type TaskAction =
  | {
      kind: "snapshot";
    }
  | {
      kind: "start";
      description: string;
      durationMinutes: number;
      customDuration?: true;
    }
  | {
      kind: "edit";
      description: string;
    }
  | {
      kind: "pause" | "resume" | "stop" | "complete";
    }
  | {
      kind: "lock";
      durationMinutes?: number;
    }
  | {
      kind: "bookmark";
      description: string;
      bookmarked: boolean;
    }
  | {
      kind: "delete-recent";
      description: string;
    }
  | {
      kind: "review-message";
      message: string;
    }
  | {
      kind: "review-edit";
      message: string;
      durationMinutes?: number;
      customDuration?: true;
    }
  | {
      kind: "review-cancel";
    };
export interface TaskControlRequest {
  action: TaskAction;
  expectedTaskId: string | null;
  expectedReviewId: string | null;
}
export interface TaskView {
  id: string;
  description: string;
  context: string;
  source: "todoist" | "obsidian" | null;
  sourceUrl: string | null;
  startedAt: number;
  elapsedMs: number;
  remainingMs: number | null;
  paused: boolean;
  openEnded: boolean;
  locked: boolean;
  lockEndsAt: number | null;
  canLock: boolean;
}
export interface TaskReview {
  id: string;
  kind: "start" | "edit";
  description: string;
  durationMinutes: number;
  status: "checking" | "unproductive" | "error";
  chat: {
    role: string;
    content: string;
  }[];
  expiresAt?: number;
}
export interface TaskSnapshot {
  deviceId: string;
  capturedAt: number;
  task: TaskView | null;
  review: TaskReview | null;
  recentTasks: {
    description: string;
    durationMinutes: number;
    bookmarked?: boolean;
    workedMs: number;
  }[];
  durationChoices: number[];
  defaultDurationMinutes: number;
  customDurationAllowed: boolean;
  maxDurationMinutes: number;
  descriptionLimit: number;
  canStart: boolean;
  weekSpent: boolean;
}
export type TaskControlResponse =
  | {
      ok: true;
      snapshot: TaskSnapshot;
    }
  | {
      ok: false;
      error: string;
      snapshot?: TaskSnapshot;
    };
