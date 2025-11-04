// TaskNotes API Type Definitions

export interface Task {
  id: string;
  path: string;
  title: string;
  status: string;
  priority?: string;
  due?: string;
  scheduled?: string;
  tags?: string[];
  projects?: string[];
  contexts?: string[];
  dateCreated?: string;
  dateModified?: string;
  details?: string;
  timeEstimate?: number;
  archived?: boolean;
}

export interface TasksResponse {
  success: boolean;
  data?: {
    tasks: Task[];
    pagination: {
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
  error?: string;
  message?: string;
}

export interface TaskResponse {
  success: boolean;
  data?: Task;
  error?: string;
  message?: string;
}

export interface CreateTaskInput {
  title: string;
  priority?: string;
  status?: string;
  due?: string;
  scheduled?: string;
  tags?: string[];
  projects?: string[];
  contexts?: string[];
  details?: string;
  timeEstimate?: number;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface HealthResponse {
  success: boolean;
  data?: {
    status: string;
    timestamp: string;
  };
  error?: string;
}

export interface PomodoroSession {
  id: string;
  type: string;
  duration: number;
  startTime: string;
}

export interface PomodoroStatusResponse {
  success: boolean;
  data?: {
    isRunning: boolean;
    timeRemaining: number;
    currentSession?: PomodoroSession;
    totalPomodoros: number;
    currentStreak: number;
    totalMinutesToday: number;
  };
  error?: string;
}

export interface PomodoroStartResponse {
  success: boolean;
  data?: {
    session: PomodoroSession;
    task?: {
      id: string;
      title: string;
    };
    message: string;
  };
  error?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface TaskListFilters {
  status?: string;
  priority?: string;
  project?: string;
  tag?: string;
  overdue?: boolean;
  completed?: boolean;
  archived?: boolean;
  due_before?: string;
  due_after?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

// NLP API Types
export interface NLPParseInput {
  text: string;
  locale?: string;
}

export interface NLPParsedData {
  title?: string;
  priority?: string;
  due?: string;
  scheduled?: string;
  tags?: string[];
  projects?: string[];
  contexts?: string[];
  timeEstimate?: number;
  recurrence?: string;
}

export interface NLPParseResponse {
  success: boolean;
  data?: NLPParsedData;
  error?: string;
  message?: string;
}

export interface NLPCreateResponse {
  success: boolean;
  data?: {
    task: Task;
    parsed: NLPParsedData;
  };
  error?: string;
  message?: string;
}
