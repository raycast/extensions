interface Project {
  id: number;
  name: string;
  description: string;
  statistics: {
    completionPercentage: number;
    totalTasks: number;
    dueDate: string;
  };
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  number: number;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  position: number;
  createdAt: string;
  userId: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  projectId: string;
}

interface Column {
  isFinal: boolean;
  id: string;
  name: string;
  tasks: Task[];
}

interface ProjectDetail extends Project {
  columns: Column[];
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface Member {
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
  id: string;
  user: UserDetail;
}

interface Users {
  members: Member[];
  total: number;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  resourceId: string;
  resourceType: string;
  createdAt: string;
}

interface CreateTaskFormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  projectId: string;
}

interface CreateProjectFormValues {
  name: string;
  slug: string;
}

export type {
  Project,
  Task,
  ProjectDetail,
  Users,
  Member,
  UserDetail,
  Column,
  Notification,
  CreateTaskFormValues,
  CreateProjectFormValues,
};
