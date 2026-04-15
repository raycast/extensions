/**
 * Type definitions for Cleyo API
 * Matches backend schema with UUID-based IDs
 */

export type TaskStatus =
  | "active"
  | "done"
  | "delayed"
  | "snoozed"
  | "waiting"
  | "cancelled";

export type EnergyLevel = "low" | "medium" | "high";

export type TaskCategory =
  | "personal"
  | "work"
  | "health"
  | "home"
  | "finance"
  | "errands"
  | "long-term";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  raw_input?: string | null;
  status: TaskStatus;
  project_id?: string | null;
  category?: TaskCategory | null;
  tags: string[];
  priority?: number | null;
  urgency?: number | null;
  complexity?: number | null;
  effort_estimate_minutes?: number | null;
  energy_required?: EnergyLevel | null;
  due_date?: string | null;
  scheduled_date?: string | null;
  procrastination_score: number;
  times_ignored: number;
  last_snoozed_at?: string | null;
  created_at: string;
  updated_at: string;
  project?: Project | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  keywords: string[];
  auto_detected: boolean;
  confidence_score?: number | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export interface CreateTaskRequest {
  raw_input: string;
}

export interface SearchTasksParams {
  status?: TaskStatus;
  category?: TaskCategory;
  project_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PlannedTask {
  task_id: string;
  time_allocation_minutes: number;
  reasoning: string;
  task: Task;
}

export interface DailyPlan {
  date: string;
  must_do: PlannedTask[];
  procrastinated_focus?: PlannedTask | null;
  quick_wins: PlannedTask[];
  total_time_minutes: number;
  buffer_time_minutes: number;
  overall_reasoning: string;
}

export interface PlanningParams {
  energy_level?: EnergyLevel;
  available_hours?: number;
}
