export type CommandListName = 'inbox' | 'today' | 'anytime' | 'upcoming' | 'someday' | 'logbook' | 'trash';

// ---------------------------------------------------------------------------
// Flat AI-friendly types (used by the AI tools, distinct from the nested UI types)
// ---------------------------------------------------------------------------

/** Checklist item within a to-do. */
export type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

/** Lightweight to-do summary — used by list/search/filter tools. */
export type TodoSummary = {
  id: string;
  name: string;
  /**
   * Present only for non-open items (logbook, trash). Absence implies 'open'.
   * Use this to distinguish completed from cancelled without a follow-up get-todo-details call.
   */
  status?: 'completed' | 'canceled';
  /** ISO 8601 date string (YYYY-MM-DD), or undefined if no due date. */
  dueDate?: string;
  /**
   * true when the due date is dynamically computed from a recurrence rule
   * (i.e. it will shift each time the task repeats). Do NOT treat it as a
   * fixed deadline.
   */
  dueDateIsRecurring: boolean;
  /** ISO 8601 date string (YYYY-MM-DD) for when the task becomes active, or undefined. */
  activationDate?: string;
  /** true when the task is a recurring task (repeating template or instance). */
  isRecurring: boolean;
  projectName?: string;
  projectId?: string;
  areaName?: string;
  areaId?: string;
};

/** Full to-do details including notes, tags, and checklist. */
export type TodoDetails = Omit<TodoSummary, 'status'> & {
  status: 'open' | 'completed' | 'canceled';
  notes: string;
  tags: string[];
  /**
   * The to-do's checklist items.
   * `null` means the checklist is unavailable on the current data source
   * (the JXA/Apple Events path cannot read checklist items); an empty array
   * means the to-do genuinely has no checklist items (only distinguishable
   * on the unofficial database path).
   */
  checklistItems: ChecklistItem[] | null;
};

/** Full project details. */
export type ProjectDetails = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  notes: string;
  tags: string[];
  dueDate?: string;
  activationDate?: string;
  areaId?: string;
  areaName?: string;
  todoCount: number;
};

/** Full area details. */
export type AreaDetails = {
  id: string;
  name: string;
  tags: string[];
  projectCount: number;
  todoCount: number;
};

export type Todo = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  areaTags: string | null;
  project?: Project;
  area?: Area;
  dueDate: string;
  activationDate: string;
  creationDate: string;
  notes: string;
  isProject?: boolean;
  isRecurring?: boolean;
  dueDateIsRecurring?: boolean;
};

export type Project = {
  id: string;
  name: string;
  status: 'open' | 'completed' | 'canceled';
  tags: string;
  dueDate: string;
  activationDate: string;
  notes: string;
  area?: Area;
  todos?: Todo[];
};

export type Area = {
  id: string;
  name: string;
  tags?: string;
  todos?: Todo[];
};

export type List = { id: string; name: string; type: 'area' | 'project' };

export type TagWithParent = {
  name: string;
  parent: string | null;
};

export type CollectionMap = {
  tags: string[];
  tagsWithHierarchy: TagWithParent[];
  projects: Project[];
  areas: Area[];
  lists: List[];
};

export type QuickFindData = {
  areas: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; areaName?: string }>;
  todos: Array<{ id: string; name: string; status: string; projectName?: string; areaName?: string }>;
};

export type ResolvedDates = {
  effectiveDeadline: string | null;
  effectiveStartDate: string | null;
  dueDateIsRecurring: boolean;
};

export type AddTodoParams = {
  title?: string;
  titles?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'checklist-items'?: string;
  'use-clipboard'?: string;
  'list-id'?: string;
  list?: string;
  'heading-id'?: string;
  heading?: string;
  completed?: boolean;
  canceled?: boolean;
  'show-quick-entry'?: boolean;
  reveal?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};

export type UpdateTodoParams = {
  title?: string;
  notes?: string;
  'prepend-notes'?: string;
  'append-notes'?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'add-tags'?: string;
  'checklist-items'?: string;
  'prepend-checklist-items'?: string;
  'append-checklist-items'?: string;
  'use-clipboard'?: string;
  'list-id'?: string;
  list?: string;
  'heading-id'?: string;
  heading?: string;
  completed?: boolean;
  canceled?: boolean;
  'show-quick-entry'?: boolean;
  reveal?: boolean;
  duplicate?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};

export type AddProjectParams = {
  title?: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'area-id'?: string;
  area?: string;
  'to-dos'?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};

export type UpdateProjectParams = {
  title?: string;
  notes?: string;
  'prepend-notes'?: string;
  'append-notes'?: string;
  when?: string;
  deadline?: string;
  tags?: string;
  'add-tags'?: string;
  'area-id'?: string;
  area?: string;
  completed?: boolean;
  canceled?: boolean;
  reveal?: boolean;
  duplicate?: boolean;
  'creation-date'?: string;
  'completion-date'?: string;
};
