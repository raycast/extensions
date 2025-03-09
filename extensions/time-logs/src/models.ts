// models.ts
export interface TimeEntry {
  id: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  createdAt: string;
  projectId?: string; // Optional project ID reference
}

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}
