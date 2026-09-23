import { Alert, Color, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { ErrorResult } from "./interfaces";

export type LifecycleAction = "deploy" | "redeploy" | "rebuild" | "start" | "stop" | "reload";

// Route suffix is always the action name itself, e.g. `application.deploy`, `postgres.rebuild`.
export const SERVICE_ACTIONS: Record<string, LifecycleAction[]> = {
  application: ["deploy", "redeploy", "start", "stop", "reload"],
  compose: ["deploy", "redeploy", "start", "stop"],
  mariadb: ["deploy", "rebuild", "start", "stop", "reload"],
  mongo: ["deploy", "rebuild", "start", "stop", "reload"],
  mysql: ["deploy", "rebuild", "start", "stop", "reload"],
  postgres: ["deploy", "rebuild", "start", "stop", "reload"],
  redis: ["deploy", "rebuild", "start", "stop", "reload"],
};

export const LIFECYCLE_ID_FIELDS: Record<string, string> = {
  application: "applicationId",
  mariadb: "mariadbId",
  mongo: "mongoId",
  mysql: "mysqlId",
  postgres: "postgresId",
  redis: "redisId",
  compose: "composeId",
};

export const ACTION_ICONS: Record<LifecycleAction, Icon> = {
  deploy: Icon.Rocket,
  redeploy: Icon.RotateClockwise,
  rebuild: Icon.Hammer,
  start: Icon.Play,
  stop: Icon.Stop,
  reload: Icon.ArrowClockwise,
};

export const ACTION_LABELS: Record<LifecycleAction, string> = {
  deploy: "Deploy",
  redeploy: "Redeploy",
  rebuild: "Rebuild",
  start: "Start",
  stop: "Stop",
  reload: "Reload",
};

export const ACTION_PROGRESS: Record<LifecycleAction, string> = {
  deploy: "Deploying",
  redeploy: "Redeploying",
  rebuild: "Rebuilding",
  start: "Starting",
  stop: "Stopping",
  reload: "Reloading",
};

export const ACTION_PAST: Record<LifecycleAction, string> = {
  deploy: "Deployed",
  redeploy: "Redeployed",
  rebuild: "Rebuilt",
  start: "Started",
  stop: "Stopped",
  reload: "Reloaded",
};

/** The `services.tsx` status accessory - reused wherever a service's raw status string needs one. */
export function statusAccessory(status: string) {
  return {
    icon: { source: Icon.CircleFilled, tintColor: status === "done" ? Color.Green : "#18181B" },
    tooltip: status,
  };
}

export interface ActionableService {
  id: string;
  type: string;
  name: string;
  appName: string;
}

export async function runServiceAction(
  url: string,
  headers: Record<string, string>,
  service: ActionableService,
  action: LifecycleAction,
  onSuccess?: () => void,
) {
  if (action === "stop") {
    const options: Alert.Options = {
      title: `Stop ${service.name}?`,
      message: "The service will become unreachable until it is started again.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Stop",
      },
    };
    if (!(await confirmAlert(options))) return;
  }

  const toast = await showToast(Toast.Style.Animated, ACTION_PROGRESS[action], service.name);
  try {
    const body: Record<string, string> = { [LIFECYCLE_ID_FIELDS[service.type]]: service.id };
    if (action === "reload") body.appName = service.appName;

    const response = await fetch(url + `${service.type}.${action}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = (await response.json()) as ErrorResult;
      throw new Error(err.message);
    }
    toast.style = Toast.Style.Success;
    toast.title = ACTION_PAST[action];
    onSuccess?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not ${action} service`;
    toast.message = `${error}`;
  }
}
