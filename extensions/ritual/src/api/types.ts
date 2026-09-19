export type Scope = "today" | "upcoming" | "inbox" | "all";

/// One subtask row, as the CLI's `checklist` field carries it — a plain
/// title and its completed state, in list order.
export type ChecklistLine = { title: string; done: boolean };

/// `scheduled` and `deadline` are DIFFERENT things. `due` is the legacy union
/// of the two, kept so an older CLI still renders; prefer the first two.
/// `tags`, `checklistDone`, `checklistTotal` and `group` arrived with schema 2
/// and are absent from a schema-1 CLI's output; `tagColors` and `checklist`
/// arrived with schema 3 and are absent from schema-1 AND schema-2 output.
/// Every consumer must tolerate all of their absence rather than assume them.
export type RitualTask = {
  schema?: number;
  id: string;
  title: string;
  notes?: string;
  project?: string;
  scheduled?: string;
  deadline?: string;
  due?: string;
  evening: boolean;
  completed: boolean;
  overdue: boolean;
  tags?: string[];
  /// One of Ritual's stored colour tokens (`red`, `blue`, ...; see
  /// `TagColorToken` in Ritual/TagColors.swift) per tag NAME that carries
  /// one — matching `tags` by name rather than riding as a same-length
  /// parallel array. A tag with no colour is simply missing from this map.
  /// Resolve a token to something Raycast can render via `tagColorHex` in
  /// `./tagColors`.
  tagColors?: Record<string, string>;
  checklistDone?: number;
  checklistTotal?: number;
  /// The task's subtasks, in order. Absent when the task has none — same
  /// "absent, not empty" convention as `tags`.
  checklist?: ChecklistLine[];
  group?: string;
};

export type RitualProject = { schema?: number; id: string; title: string };

export type RitualTag = { schema?: number; id: string; name: string };

export type RitualChange = { schema?: number; id: string; changed: boolean };

export type RitualHabit = {
  schema?: number;
  id: string;
  title: string;
  slot: string;
  doneToday: boolean;
  weekDone: number;
  weekTarget: number;
};

/// `when` accepts the CLI's named schedules or a literal YYYY-MM-DD date.
/// The five quick-schedule words (`tomorrow` plus the four below) mirror the
/// app's `CalendarSheet` chips exactly — the CLI computes the actual dates via
/// RitualKit's `SchedulePresets`, so this extension never reimplements that
/// arithmetic in TypeScript.
export type When =
  | "today"
  | "tomorrow"
  | "evening"
  | "none"
  | "weekend"
  | "next-week"
  | "next-weekend"
  | "next-month"
  | string;

export type TaskDraft = {
  title: string;
  when: "today" | "evening" | "inbox";
  notes?: string;
  deadline?: string;
  project?: string;
  tags?: string[];
};

/// `undefined` means "not editing this field"; `null` means "clear it" — the
/// CLI's `update` treats an omitted option as leave-alone and only the
/// literal string "none" as clear.
export type TaskEdits = {
  title?: string;
  notes?: string;
  deadline?: string | null;
  project?: string | null;
  addTags?: string[];
  removeTags?: string[];
};
