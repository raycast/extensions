export interface Project {
  /** Unique identifier. For Monday groups this equals the group id. */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** If the project originated from Monday.com we keep the group id here */
  mondayGroupId?: string;
}

export interface TimeEntry {
  id: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  hours: number;
  projectId: string;
  notes?: string;
}
