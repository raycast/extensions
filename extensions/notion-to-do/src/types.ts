export type TaskStatus = "Backlog" | "To-do" | "Blocked" | "In progress" | "Done";
export type TaskPriority = "Critical" | "High" | "Medium" | "Low";
export type TaskProgress = "0%" | "25%" | "50%" | "75%" | "100%";
export type TaskUrgency = "Urgent" | "Not Urgent";
export type TaskImportance = "Important" | "Not Important";
export type TaskEnergyLevel = "High Energy" | "Medium Energy" | "Low Energy";
export type TaskEstimatedTime =
  | "15 min"
  | "30 min"
  | "1 hour"
  | "2 hours"
  | "4 hours"
  | "1 day"
  | "2-3 days"
  | "1 week+";

export type TaskProject =
  | "Obsidian"
  | "Productivity"
  | "PatternedAI"
  | "Personal"
  | "Health"
  | "Finance"
  | "Learning"
  | "Home"
  | "Work"
  | "Social"
  | "Travel"
  | "Other";

export type TaskTag =
  | "Design"
  | "Development"
  | "Research"
  | "Planning"
  | "Review"
  | "Meeting"
  | "Writing"
  | "Bug"
  | "Feature"
  | "Documentation"
  | "Testing"
  | "Deployment"
  | "Other";

export interface NotionTask {
  id: string;
  url: string;
  Name: string;
  Status: TaskStatus;
  Priority?: TaskPriority;
  "Due Date"?: string;
  Planned?: string;
  Project?: TaskProject;
  Tags?: TaskTag[];
  "Estimated Time"?: TaskEstimatedTime;
  "Energy Level"?: TaskEnergyLevel;
  Progress?: TaskProgress;
  Urgency?: TaskUrgency;
  Importance?: TaskImportance;
  Link?: string;
  "Blocked by"?: string[];
  lastEditedTime?: string;
}

export interface CreateTaskFormValues {
  name: string;
  description?: string;
  project?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  planned?: Date;
  tags?: TaskTag[];
  estimatedTime?: TaskEstimatedTime;
  energyLevel?: TaskEnergyLevel;
  urgency?: TaskUrgency;
  importance?: TaskImportance;
  link?: string;
}

export interface UpdateTaskFormValues {
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: TaskProgress;
  dueDate?: Date;
  planned?: Date;
}

export const PRIORITY_ICONS: Record<TaskPriority, string> = {
  Critical: "🔴",
  High: "🟠",
  Medium: "🟡",
  Low: "⚪",
};

export const STATUS_ICONS: Record<TaskStatus, string> = {
  Backlog: "📋",
  "To-do": "📝",
  Blocked: "🚫",
  "In progress": "⏳",
  Done: "✅",
};

export const ENERGY_ICONS: Record<TaskEnergyLevel, string> = {
  "High Energy": "⚡",
  "Medium Energy": "🔋",
  "Low Energy": "🪫",
};
