export type GiphyResponse = {
  data: {
    id: string;
    type: string;
    title: string;
    images: {
      fixed_height: {
        url: string;
      };
      fixed_width: {
        url: string;
      };
    };
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
};

export interface Preferences {
  focusIntervalDuration: string;
  shortBreakIntervalDuration: string;
  longBreakIntervalDuration: string;
  enableConfetti: boolean;
  completionImage: string;
  sound: string;
  enableTimeOnMenuBar: boolean;
  giphyAPIKey: string;
  enableImage: boolean;
  enableQuote: boolean;
}

export type IntervalType = 'focus' | 'short-break' | 'long-break' | 'task';

export type IntervalPart = {
  startedAt: number;
  pausedAt?: number;
};

export type PomodoroSubTask = {
  /**
   * The subtask ID is in the `<parentTaskId>-index` format
   */
  id: `${string}-${number}`;
  title: string;
  completed: boolean;
};

export interface PomodoroTask {
  /**
   * The task ID is the current timestamp
   */
  id: string;
  title: string;
  /**
   * Subtasks from a textarea field separated by newlines
   */
  subTasks: PomodoroSubTask[];
  /**
   * An ISO 8601 date string
   */
  createdAt: string;
  /**
   * If the task is updated, this will be date of the most recent update
   */
  updatedAt: string;
  /**
   * An ISO 8601 date string
   */
  completedAt?: string;
  /**
   * Total time spent in seconds
   */
  totalTimeSpent: number;
  /**
   * Custom duration in seconds for this task
   * If undefined, use default duration from preferences
   */
  customDuration?: number;
}

export interface CreateTaskFormData {
  title: string;
  /**
   * Subtasks from a textarea field separated by newlines
   */
  subTasks: string;
  completed?: boolean;
  customDuration?: string;
}

export interface Interval {
  parts: IntervalPart[];
  intervalLength: number;
  type: IntervalType;
  task: PomodoroTask | undefined;
}

export type IntervalExecutor = {
  title: string;
  onStart: () => void;
};

export type Quote = {
  _id: string;
  content: string;
  author: string;
  authorSlug: string;
  length: number;
  tags: string[];
};
