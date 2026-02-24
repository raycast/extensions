import { exec } from "child_process";
import { promisify } from "util";
import { Icon } from "@raycast/api";

export function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "running":
      return { source: Icon.CircleProgress, tintColor: "green" };
    case "stopped":
      return { source: Icon.Stop, tintColor: "red" };
    case "paused":
      return { source: Icon.Pause, tintColor: "yellow" };
    default:
      return { source: Icon.QuestionMark, tintColor: "gray" };
  }
}

export const execAsync = promisify(exec);
