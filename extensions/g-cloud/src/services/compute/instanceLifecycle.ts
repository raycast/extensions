import { Color, Icon } from "@raycast/api";

export type ComputeLifecycleAction = "start" | "resume" | "stop" | "suspend" | "restart";

export interface InstanceLifecycleActionDescriptor {
  kind: ComputeLifecycleAction;
  title: string;
  icon: Icon;
  tintColor?: Color;
}

export interface InstanceLifecycleConfirmation {
  title: string;
  message: string;
  actionTitle: string;
  isDestructive?: boolean;
}

export interface InstanceLifecycleToast {
  title: string;
  message: string;
}

const TRANSITIONAL_STATUSES = new Set(["provisioning", "staging", "starting", "stopping", "suspending", "repairing"]);

export function normalizeInstanceStatus(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "stopped") return "terminated";
  return normalized;
}

export function isInstanceTransitionalStatus(status: string): boolean {
  return TRANSITIONAL_STATUSES.has(normalizeInstanceStatus(status));
}

export function getInstanceLifecycleActions(status: string): InstanceLifecycleActionDescriptor[] {
  switch (normalizeInstanceStatus(status)) {
    case "running":
      return [
        { kind: "stop", title: "Stop Instance", icon: Icon.Stop, tintColor: Color.Red },
        { kind: "suspend", title: "Suspend Instance", icon: Icon.Pause, tintColor: Color.Yellow },
        { kind: "restart", title: "Restart Instance", icon: Icon.ArrowClockwise, tintColor: Color.Orange },
      ];
    case "suspended":
      return [{ kind: "resume", title: "Resume Instance", icon: Icon.Play, tintColor: Color.Green }];
    case "terminated":
      return [{ kind: "start", title: "Start Instance", icon: Icon.Play, tintColor: Color.Green }];
    default:
      return [];
  }
}

export function getOptimisticStatusForAction(action: ComputeLifecycleAction): string {
  switch (action) {
    case "start":
    case "resume":
      return "STARTING";
    case "stop":
      return "STOPPING";
    case "suspend":
      return "SUSPENDING";
    case "restart":
      return "REPAIRING";
  }
}

export function getLifecycleActionConfirmation(
  action: ComputeLifecycleAction,
  instanceName: string,
): InstanceLifecycleConfirmation | null {
  switch (action) {
    case "stop":
      return {
        title: "Stop Instance",
        message: `Are you sure you want to stop the instance ${instanceName}?`,
        actionTitle: "Stop",
        isDestructive: true,
      };
    case "suspend":
      return {
        title: "Suspend Instance",
        message: `Are you sure you want to suspend the instance ${instanceName}?`,
        actionTitle: "Suspend",
      };
    case "restart":
      return {
        title: "Restart Instance",
        message: `Are you sure you want to restart the instance ${instanceName}?`,
        actionTitle: "Restart",
        isDestructive: true,
      };
    default:
      return null;
  }
}

export function getLifecycleActionProgressToast(
  action: ComputeLifecycleAction,
  instanceName: string,
  zone: string,
): InstanceLifecycleToast {
  switch (action) {
    case "start":
      return { title: `Starting instance ${instanceName}...`, message: `Zone: ${zone}` };
    case "resume":
      return { title: `Resuming instance ${instanceName}...`, message: `Zone: ${zone}` };
    case "stop":
      return { title: `Stopping instance ${instanceName}...`, message: `Zone: ${zone}` };
    case "suspend":
      return { title: `Suspending instance ${instanceName}...`, message: `Zone: ${zone}` };
    case "restart":
      return { title: `Restarting instance ${instanceName}...`, message: `Zone: ${zone}` };
  }
}

export function getLifecycleActionSuccessToast(
  action: ComputeLifecycleAction,
  instanceName: string,
  isTimedOut = false,
): InstanceLifecycleToast {
  if (isTimedOut) {
    switch (action) {
      case "start":
        return {
          title: "Start requested",
          message: `${instanceName} is still changing state. Refresh again in a moment to confirm it is running.`,
        };
      case "resume":
        return {
          title: "Resume requested",
          message: `${instanceName} is still changing state. Refresh again in a moment to confirm it is running.`,
        };
      case "stop":
        return {
          title: "Instance stopping",
          message: `${instanceName} is still changing state. It may take several minutes to stop completely.`,
        };
      case "suspend":
        return {
          title: "Instance suspending",
          message: `${instanceName} is still changing state. Refresh again in a moment to confirm it is suspended.`,
        };
      case "restart":
        return {
          title: "Instance restarting",
          message: `${instanceName} is still changing state. Refresh again in a moment to confirm it is running.`,
        };
    }
  }

  switch (action) {
    case "start":
      return { title: "Instance running", message: `${instanceName} is now running.` };
    case "resume":
      return { title: "Instance resumed", message: `${instanceName} is now running.` };
    case "stop":
      return { title: "Instance stopped", message: `${instanceName} is now stopped.` };
    case "suspend":
      return { title: "Instance suspended", message: `${instanceName} is now suspended.` };
    case "restart":
      return { title: "Instance restarted", message: `${instanceName} is now running.` };
  }
}

export function getLifecycleActionFailureTitle(action: ComputeLifecycleAction): string {
  switch (action) {
    case "start":
      return "Failed to start instance";
    case "resume":
      return "Failed to resume instance";
    case "stop":
      return "Failed to stop instance";
    case "suspend":
      return "Failed to suspend instance";
    case "restart":
      return "Failed to restart instance";
  }
}

export function getInstanceStatusPresentation(status: string): { icon: Icon; color: Color; text: string } {
  switch (normalizeInstanceStatus(status)) {
    case "running":
      return { icon: Icon.Circle, color: Color.Green, text: "Running" };
    case "terminated":
      return { icon: Icon.Circle, color: Color.Red, text: "Stopped" };
    case "suspended":
      return { icon: Icon.Pause, color: Color.Yellow, text: "Suspended" };
    case "starting":
    case "provisioning":
    case "staging":
      return { icon: Icon.CircleProgress, color: Color.Blue, text: "Starting" };
    case "stopping":
      return { icon: Icon.CircleProgress, color: Color.Orange, text: "Stopping" };
    case "suspending":
      return { icon: Icon.CircleProgress, color: Color.Orange, text: "Suspending" };
    case "repairing":
      return { icon: Icon.CircleProgress, color: Color.Yellow, text: "Restarting" };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText, text: status };
  }
}

export function getInstanceTip(status: string): string {
  const actions = getInstanceLifecycleActions(status);
  if (actions.length === 0) {
    return "Press ⌘+R to refresh instance details.";
  }

  if (actions.length === 1) {
    return `Press ⌘+S to ${actions[0].title.toLowerCase()}.`;
  }

  return `Available power actions: ${actions.map((action) => action.title.replace(" Instance", "").toLowerCase()).join(", ")}.`;
}
