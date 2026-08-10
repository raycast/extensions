import { Icon, Color } from "@raycast/api";
import { TaskStatus, TaskType } from "./types";

export const TASK_STATUS_ICONS: Record<TaskStatus, Icon> = {
  waiting: Icon.Clock,
  downloading: Icon.Download,
  paused: Icon.Pause,
  finished: Icon.CheckCircle,
  finishing: Icon.CheckCircle,
  extracting: Icon.Box,
  error: Icon.XMarkCircle,
  seeding: Icon.Upload,
};

export const TASK_STATUS_COLORS: Record<TaskStatus, Color> = {
  waiting: Color.Yellow,
  downloading: Color.Blue,
  paused: Color.Orange,
  finished: Color.Green,
  finishing: Color.Green,
  extracting: Color.Purple,
  error: Color.Red,
  seeding: Color.Green,
};

export const TASK_TYPE_ICONS: Record<TaskType, Icon> = {
  bt: Icon.Globe,
  nzb: Icon.Document,
  http: Icon.Link,
  ftp: Icon.Folder,
  emule: Icon.Network,
};

export const FILTER_OPTIONS = [
  { title: "All Tasks", value: "all" },
  { title: "Downloading", value: "downloading" },
  { title: "Finished", value: "finished" },
  { title: "Paused", value: "paused" },
  { title: "Waiting", value: "waiting" },
  { title: "Error", value: "error" },
];

export const SYNOLOGY_ERROR_CODES: Record<number, string> = {
  100: "Unknown error",
  101: "Invalid parameter",
  102: "The requested API does not exist",
  103: "The requested method does not exist",
  104: "The requested version does not support the functionality",
  105: "The logged in session does not have permission",
  106: "Session timeout",
  107: "Session interrupted by duplicate login",
  400: "No such account or incorrect password",
  401: "Account disabled",
  402: "Permission denied",
  403: "2-step verification code required",
  404: "Failed to authenticate 2-step verification code",
};

export const REFRESH_INTERVAL = 5000; // 5 seconds for active downloads
export const SESSION_STORAGE_KEY = "synology-session-id";
