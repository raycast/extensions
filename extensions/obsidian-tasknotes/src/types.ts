export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due?: string;
  scheduled?: string;
  path: string;
  archived: boolean;
  tags: string[];
  contexts: string[];
  projects: string[];
  totalTrackedTime: number;
  timeEstimate?: number;
  dateCreated: string;
  dateModified: string;
  isBlocked: boolean;
  isBlocking: boolean;
  completedDate?: string;
}

export interface ApiResponse {
  success: boolean;
  data: {
    tasks: Task[];
    pagination: {
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
    };
    vault: {
      name: string;
      path: string;
    };
  };
  error?: {
    message: string;
    code: string;
  };
}
