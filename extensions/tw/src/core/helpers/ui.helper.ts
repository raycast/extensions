import { Color, Icon } from "@raycast/api";
import { Task } from "../types/task.model";
import { Priority, Status, State, Urgency, ViewReport } from "../types/task-cli.type";
import { ExportableAction } from "../types/task.type";

export type ViewProp = {
  value: string;
  color: Color;
};

type View<T> = {
  [K in keyof T]?: undefined | false | string | ViewProp;
};

export type TaskView = View<Task>;

type ViewItem = {
  label: string;
  icon: Icon;
  color: Color;
  desc: string;
};

type ViewItemWithAbbr = ViewItem & {
  abbr: string;
};

type ViewFilter = {
  title: string;
  icon: Icon | { source: Icon; tintColor: Color };
};

export const viewFilters: Record<ViewReport, ViewFilter> = {
  all: {
    title: "All",
    icon: { source: Icon.BulletPoints, tintColor: Color.Blue },
  },
  next: {
    title: "Next",
    icon: { source: Icon.Stopwatch, tintColor: Color.PrimaryText },
  },
  active: {
    title: "Active",
    icon: { source: Icon.CircleProgress25, tintColor: Color.Orange },
  },
  overdue: {
    title: "Overdue",
    icon: { source: Icon.CircleProgress50, tintColor: Color.Red },
  },
  blocked: {
    title: "Blocked",
    icon: { source: Icon.Stop, tintColor: Color.Yellow },
  },
  blocking: {
    title: "Blocking",
    icon: { source: Icon.StopFilled, tintColor: Color.Yellow },
  },
  completed: {
    title: "Completed",
    icon: { source: Icon.CircleProgress100, tintColor: Color.Green },
  },
} as const;

export type ViewType = {
  type: "filter" | "tag" | "project";
  value: ExportableAction;
};

export type ViewTypes = {
  all: ViewType[];
  tags: string[];
  projects: string[];
  revalidateTags: () => void;
  revalidateProjects: () => void;
};

export const priorities: Record<Priority, ViewItemWithAbbr> = {
  L: {
    label: "Low",
    abbr: "Ⓛ",
    icon: Icon.CheckRosette,
    color: Color.Yellow,
    desc: "Low",
  },
  M: {
    label: "Medium",
    abbr: "Ⓜ",
    icon: Icon.CheckRosette,
    color: Color.Yellow,
    desc: "Medium",
  },
  H: {
    label: "High",
    abbr: "Ⓗ",
    icon: Icon.CheckRosette,
    color: Color.Yellow,
    desc: "High",
  },
} as const;

export const statuses: Record<Status, ViewItem> = {
  pending: {
    label: "Pending",
    icon: Icon.Stopwatch,
    color: Color.SecondaryText,
    desc: "Task that has not yet been completed or deleted",
  },

  deleted: {
    label: "Deleted",
    icon: Icon.MinusCircle,
    color: Color.Red,
    desc: "Task that has been removed from the pending state",
  },

  completed: {
    label: "Completed",
    icon: Icon.CircleProgress100,
    color: Color.Green,
    desc: "Task that has been removed from the pending state by completion",
  },

  waiting: {
    label: "Waiting",
    icon: Icon.Clock,
    color: Color.Yellow,
    desc: "A Pending Task that has been hidden from typical view",
  },

  recurring: {
    label: "Recurring",
    icon: Icon.RotateClockwise,
    color: Color.Blue,
    desc: "A parent template Task from which child tasks are cloned",
  },
} as const;

export const states: Record<State, ViewItem> = {
  // task _get <id>.tags.SCHEDULED
  scheduled: {
    label: "Scheduled",
    icon: Icon.Clock,
    color: Color.Green,
    desc: "The task is scheduled and has a scheduled date",
  },
  // task _get <id>.tags.READY
  ready: {
    label: "Ready",
    icon: Icon.Stopwatch,
    color: Color.Blue,
    desc: "The task is pending, not blocked, and either not scheduled, or scheduled before now",
  },
  // task _get <id>.tags.ACTIVE
  active: {
    label: "Active",
    icon: Icon.CircleProgress25,
    color: Color.Orange,
    desc: "The task is started and has a start date",
  },
  // task _get <id>.tags.OVERDUE
  overdue: {
    label: "Overdue",
    icon: Icon.CircleProgress50,
    color: Color.Red,
    desc: "The task is past its due date",
  },
  // task _get <id>.tags.BLOCKED
  blocked: {
    label: "Blocked",
    icon: Icon.Stop,
    color: Color.Yellow,
    desc: "The task is dependent on another incomplete task",
  },
  // task _get <id>.tags.BLOCKING
  blocking: {
    label: "Blocking",
    icon: Icon.StopFilled,
    color: Color.Yellow,
    desc: "Another task depends on this incomplete task",
  },
  // task _get <id>.tags.COMPLETED
  completed: {
    label: "Completed",
    icon: Icon.CircleProgress100,
    color: Color.Green,
    desc: "The task is completed",
  },
  // task _get <id>.end
  done: {
    label: "Done",
    icon: Icon.CheckCircle,
    color: Color.Green,
    desc: "The task is completed, deleted or has an end date",
  },
  deleted: {
    label: "Deleted",
    icon: Icon.MinusCircle,
    color: Color.Red,
    desc: "Task that has been removed from the pending state",
  },
} as const;

export const urgencies: Record<Urgency, ViewItemWithAbbr> = {
  L: {
    label: "Low",
    abbr: "🅄",
    icon: Icon.ExclamationMark,
    color: Color.Yellow,
    desc: "Low",
  },
  M: {
    label: "Medium",
    abbr: "🅄",
    icon: Icon.ExclamationMark,
    color: Color.Magenta,
    desc: "Medium",
  },
  H: {
    label: "High",
    abbr: "🅄",
    icon: Icon.ExclamationMark,
    color: Color.Red,
    desc: "High",
  },
} as const;

export const situations = {
  ...statuses,
  ...states,
} as const;
