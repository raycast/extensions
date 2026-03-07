import { Icon, Color, closeMainWindow } from "@raycast/api";
import { spawn } from "child_process";
import { RepoStatus } from "./types";

export function getStatusIcon(status: RepoStatus) {
  switch (status) {
    case "idle":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "pulling":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "updated":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "up-to-date":
      return { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
    case "dirty":
      return { source: Icon.Warning, tintColor: Color.Yellow };
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

export function getStatusTag(status: RepoStatus): { value: string; color: Color } {
  switch (status) {
    case "idle":
      return { value: "Ready", color: Color.SecondaryText };
    case "pulling":
      return { value: "Pulling...", color: Color.Blue };
    case "updated":
      return { value: "Updated", color: Color.Green };
    case "up-to-date":
      return { value: "Up to date", color: Color.SecondaryText };
    case "dirty":
      return { value: "Uncommitted changes", color: Color.Yellow };
    case "error":
      return { value: "Failed", color: Color.Red };
  }
}

export function openInApp(appPath: string, projectPath: string) {
  spawn("open", ["-a", appPath, projectPath], { env: {} });
  closeMainWindow();
}
