import { Color, Icon } from "@raycast/api";
import type { TaskStatus } from "../api/types";

export interface StatusPresentation {
  icon: Icon;
  color: Color;
  label: string;
}

const PRESENTATIONS: Record<TaskStatus, StatusPresentation> = {
  provisioning: { icon: Icon.Hourglass, color: Color.Yellow, label: "Provisioning" },
  running: { icon: Icon.CircleProgress, color: Color.Blue, label: "Running" },
  suspending: { icon: Icon.Pause, color: Color.Orange, label: "Suspending" },
  suspended: { icon: Icon.Pause, color: Color.SecondaryText, label: "Suspended" },
  resuming: { icon: Icon.Play, color: Color.Yellow, label: "Resuming" },
  error: { icon: Icon.ExclamationMark, color: Color.Red, label: "Error" },
  deleted: { icon: Icon.Trash, color: Color.SecondaryText, label: "Deleted" },
};

export function getStatusPresentation(status: TaskStatus): StatusPresentation {
  return (
    PRESENTATIONS[status] ?? { icon: Icon.QuestionMark, color: Color.SecondaryText, label: status }
  );
}
