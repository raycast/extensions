import { Color, Icon } from "@raycast/api";

import type { NavigableView } from "../api/types";

export const VIEW_CONFIG: Record<NavigableView, { title: string; icon: Icon; color: Color }> = {
  anytime: { color: Color.Green, icon: Icon.Calendar, title: "Anytime" },
  inbox: { color: Color.Blue, icon: Icon.Tray, title: "Inbox" },
  someday: { color: Color.Orange, icon: Icon.Cloud, title: "Someday" },
  today: { color: Color.Yellow, icon: Icon.Star, title: "Today" },
  upcoming: { color: Color.Purple, icon: Icon.Clock, title: "Upcoming" },
};

export const TASK_STATE_ICONS = {
  archived: Icon.XMarkCircle,
  done: Icon.CheckCircle,
  open: Icon.Circle,
} as const;

export const PROJECT_STATUS_ICONS: Record<string, Icon> = {
  active: Icon.Folder,
  done: Icon.CheckCircle,
  dropped: Icon.XMarkCircle,
  on_hold: Icon.Pause,
};
