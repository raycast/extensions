export interface Project {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  status: string;
}

export interface WorkPackageType {
  id: number;
  name: string;
  color: string;
  position: number;
}

export interface User {
  id: number;
  name: string;
  login: string;
  mail: string;
}

export interface Priority {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
}

export interface WorkPackage {
  id: number;
  subject: string;
  description?: {
    raw: string;
    html: string;
  };
  project: {
    id: number;
    name: string;
  };
  type: {
    id: number;
    name: string;
  };
  status: {
    id: number;
    name: string;
  };
  assignee?: {
    id: number;
    name: string;
  };
  priority: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  lockVersion?: number;
}

export interface CreateWorkPackageRequest {
  subject: string;
  description?: string;
  projectId: number;
  typeId: number;
  assigneeId?: number;
  priorityId?: number;
}

export interface UpdateWorkPackageRequest {
  id: number;
  subject?: string;
  description?: string;
  assigneeId?: number;
  priorityId?: number;
  statusId?: number;
}

export interface CreateTicketFormValues {
  subject: string;
  description: string;
  project: string;
  type: string;
  assignee: string;
  priority: string;
}

export interface UpdateTicketFormValues {
  subject: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
}
