import { Action, Icon } from "@raycast/api";
import { taskAppUrl, taskUrl } from "../api/client";
import type { Task } from "../api/types";
import { useOpenTarget } from "../hooks/useOpenTarget";

/**
 * Opens a task where the user would expect it: the desktop app when it is
 * installed AND claims the link, the browser otherwise.
 */
export function OpenTaskAction({ task }: { task: Task }) {
  const desktop = useOpenTarget();

  if (desktop) {
    return <Action.Open title="Open in Hule" icon={Icon.AppWindow} target={taskAppUrl(task)} application={desktop} />;
  }
  return <Action.OpenInBrowser title="Open in Hule" url={taskUrl(task)} />;
}
