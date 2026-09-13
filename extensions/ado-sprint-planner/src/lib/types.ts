// Personal, local-only workflow status — independent of ADO's System.State.
// Ids absent from the persisted status map are treated as "not-started".
export type LocalStatus = "not-started" | "in-progress" | "done";

export interface Preferences {
  pat: string;
  organization: string;
  project: string;
  team?: string; // primary team; required only for Plan Sprint
  teams?: string; // comma-separated extra teams for multi-team fetch in My Sprint
  doneState: string;
  extraOpenStates?: string; // comma-separated states to treat as open (e.g. "Failed")
  dailyCapacity: string;
  geminiApiKey?: string; // optional; enables Auto (AI) sprint sequencing
  planMode?: string; // "deterministic" | "auto" — default deterministic
  includeBacklog?: boolean; // plan my other open tickets alongside the sprint (default true)
}

export interface WorkItem {
  id: number;
  title: string;
  type: string; // User Story | Bug | Task
  state: string;
  priority?: number;
  storyPoints?: number;
  url: string; // browser URL
  team?: string; // set when fetched via a team-scoped query (My Sprint)
  iterationPath?: string; // System.IterationPath, used to group project-wide results
  inSprint?: boolean; // set by the planner pool: true = current sprint, false = backlog
}

export interface Iteration {
  id: string;
  name: string;
  path: string;
  startDate?: string; // ISO
  finishDate?: string; // ISO
}

// A local-only ad-hoc to-do jotted in Today's To-Do (e.g. meeting feedback).
// Purely a display overlay — never enters the sprint plan/projection/capacity.
// Carries forward until completed (completing removes it).
export interface ManualTodo {
  id: string; // local unique id (not an ADO work item)
  text: string;
  createdAt: string; // ISO — drives the "carried Nd" badge
  status?: LocalStatus; // same 3-stage local status as work items; "done" removes it
  seq: number; // monotonic sort key; higher = nearer the top (newest-first)
}

// The persisted plan: an ordered queue of work-item ids. Days are projected
// live (see projectPlan) from this order + remaining working days + capacity,
// so unfinished work rolls forward instead of stranding on a fixed date.
export interface SprintPlan {
  iterationId: string;
  generatedAt: string; // ISO
  order: number[]; // work-item ids, in the order they should be worked
}
