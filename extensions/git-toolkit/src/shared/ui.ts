import { Icon, Color, Toast, closeMainWindow, showToast } from "@raycast/api";
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

export function openInApp(appPath: string, projectPath: string, options?: { passProjectPathArg?: boolean }) {
  const passProjectPathArg = options?.passProjectPathArg ?? true;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { NODE_ENV, ...filteredEnv } = process.env;

  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", "/d", projectPath, appPath, ...(passProjectPathArg ? [projectPath] : [])], {
          detached: true,
          env: filteredEnv,
        })
      : spawn("open", ["-a", appPath, ...(passProjectPathArg ? [projectPath] : [])], {
          env: {},
        });

  child.on("error", (err) => {
    showToast({ style: Toast.Style.Failure, title: "Failed to open app", message: String(err) });
  });

  closeMainWindow();
}
