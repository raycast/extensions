import { Color, Icon } from "@raycast/api";
import type { TaskView } from "../api/types";

export const VIEW_CONFIG: Record<TaskView, { title: string; icon: Icon; color: Color }> = {
  inbox: { title: "Inbox", icon: Icon.Tray, color: Color.Blue },
  today: { title: "Today", icon: Icon.Star, color: Color.Yellow },
  anytime: { title: "Anytime", icon: Icon.Calendar, color: Color.Green },
  upcoming: { title: "Upcoming", icon: Icon.Clock, color: Color.Purple },
  someday: { title: "Someday", icon: Icon.Cloud, color: Color.Orange },
};

export const TASK_STATE_ICONS = {
  open: Icon.Circle,
  done: Icon.CheckCircle,
  archived: Icon.XMarkCircle,
} as const;

export const PROJECT_STATUS_ICONS: Record<string, Icon> = {
  active: Icon.Folder,
  on_hold: Icon.Pause,
  done: Icon.CheckCircle,
  dropped: Icon.XMarkCircle,
};
